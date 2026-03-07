"use node";

import { v, ConvexError } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// Filler words to detect in transcript
const FILLER_WORDS = new Set([
  "um",
  "uh",
  "umm",
  "uhh",
  "hmm",
  "hm",
  "er",
  "ah",
  "eh",
  "like", // only flagged when standalone hesitation — Whisper often isolates these
  "you know",
  "i mean",
  "so", // flagged only when at start followed by pause
]);

// Minimum gap between words (in seconds) to flag as a silence
const SILENCE_THRESHOLD = 2.0;

interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

interface WhisperResponse {
  text: string;
  words?: WhisperWord[];
  segments?: WhisperSegment[];
}

function isFillerWord(word: string): boolean {
  const normalized = word.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  return FILLER_WORDS.has(normalized);
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z']/g, "").trim();
}

function detectRepetitions(words: WhisperWord[]): Set<number> {
  const repeated = new Set<number>();
  // Detect consecutive identical words (e.g. "I I", "the the the")
  for (let i = 1; i < words.length; i++) {
    const prev = normalizeWord(words[i - 1].word);
    const curr = normalizeWord(words[i].word);
    if (prev.length >= 1 && prev === curr) {
      // Mark the duplicate (keep the last occurrence, flag earlier ones)
      repeated.add(i - 1);
      // If there's a chain (a a a), keep flagging
      if (i >= 2 && normalizeWord(words[i - 2].word) === curr) {
        repeated.add(i - 1);
      }
    }
  }
  // Also detect 2-word phrase repetitions (e.g. "I think I think")
  for (let i = 2; i < words.length - 1; i++) {
    const phrase1 = normalizeWord(words[i - 2].word) + " " + normalizeWord(words[i - 1].word);
    const phrase2 = normalizeWord(words[i].word) + " " + normalizeWord(words[i + 1].word);
    if (phrase1.length >= 3 && phrase1 === phrase2) {
      repeated.add(i - 2);
      repeated.add(i - 1);
    }
  }
  return repeated;
}

function processTranscript(
  words: WhisperWord[]
): Array<{
  word: string;
  start: number;
  end: number;
  isFiller: boolean;
  isDeleted: boolean;
}> {
  const transcript: Array<{
    word: string;
    start: number;
    end: number;
    isFiller: boolean;
    isDeleted: boolean;
  }> = [];

  const repetitions = detectRepetitions(words);

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const isFiller = isFillerWord(w.word) || repetitions.has(i);

    transcript.push({
      word: w.word.trim(),
      start: w.start,
      end: w.end,
      isFiller,
      isDeleted: false,
    });

    // Detect silences: insert a [silence] marker if gap > threshold
    if (i < words.length - 1) {
      const gap = words[i + 1].start - w.end;
      if (gap >= SILENCE_THRESHOLD) {
        transcript.push({
          word: `[silence ${gap.toFixed(1)}s]`,
          start: w.end,
          end: words[i + 1].start,
          isFiller: true,
          isDeleted: false,
        });
      }
    }
  }

  return transcript;
}

export const analyzeVideo = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ConvexError(
        "OPENAI_API_KEY environment variable is not set. " +
          "Add it in your Convex dashboard under Settings > Environment Variables."
      );
    }

    // Set status to analyzing
    await ctx.runMutation(internal.analyze.setProjectStatus, {
      projectId: args.projectId,
      status: "analyzing",
    });

    try {
      // Get the project to find the video file
      const project = await ctx.runQuery(internal.analyze.getProject, {
        id: args.projectId,
      });
      if (!project || !project.videoFileId) {
        throw new ConvexError("Project not found or has no video file.");
      }

      // Get the video blob from storage
      const videoBlob = await ctx.storage.get(project.videoFileId);
      if (!videoBlob) {
        throw new ConvexError("Video file not found in storage.");
      }

      // Read video as ArrayBuffer
      const arrayBuffer = await videoBlob.arrayBuffer();
      const videoBuffer = new Uint8Array(arrayBuffer);

      // Send to OpenAI Whisper API
      // Whisper accepts video files directly (extracts audio internally)
      const formData = new FormData();
      const fileBlob = new Blob([videoBuffer], { type: "video/mp4" });
      formData.append("file", fileBlob, "video.mp4");
      formData.append("model", "whisper-1");
      formData.append("response_format", "verbose_json");
      formData.append("timestamp_granularities[]", "word");

      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new ConvexError(
          `Whisper API error (${response.status}): ${errorText}`
        );
      }

      const result = (await response.json()) as WhisperResponse;

      // Process the word-level timestamps
      let transcript;
      if (result.words && result.words.length > 0) {
        transcript = processTranscript(result.words);
      } else if (result.segments && result.segments.length > 0) {
        // Fallback: if no word-level timestamps, create from segments
        const segmentWords: WhisperWord[] = [];
        for (const segment of result.segments) {
          const words = segment.text.trim().split(/\s+/);
          const duration = segment.end - segment.start;
          const wordDuration = duration / words.length;
          words.forEach((word, i) => {
            segmentWords.push({
              word,
              start: segment.start + i * wordDuration,
              end: segment.start + (i + 1) * wordDuration,
            });
          });
        }
        transcript = processTranscript(segmentWords);
      } else {
        // Last resort: single block from full text
        const words = result.text.trim().split(/\s+/);
        transcript = words.map((word, i) => ({
          word,
          start: i * 0.5,
          end: (i + 1) * 0.5,
          isFiller: isFillerWord(word),
          isDeleted: false,
        }));
      }

      // Save transcript and set status to ready
      await ctx.runMutation(internal.analyze.saveTranscript, {
        projectId: args.projectId,
        transcript,
      });

      return { success: true, wordCount: transcript.length };
    } catch (error) {
      // On error, reset status to ready so user can retry
      await ctx.runMutation(internal.analyze.setProjectStatus, {
        projectId: args.projectId,
        status: "ready",
      });
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError(
        error instanceof Error ? error.message : "Analysis failed unexpectedly."
      );
    }
  },
});

// Internal mutations used by the action
export const setProjectStatus = internalMutation({
  args: {
    projectId: v.id("projects"),
    status: v.union(
      v.literal("uploading"),
      v.literal("analyzing"),
      v.literal("ready")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, { status: args.status });
  },
});

export const getProject = internalQuery({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const saveTranscript = internalMutation({
  args: {
    projectId: v.id("projects"),
    transcript: v.array(
      v.object({
        word: v.string(),
        start: v.number(),
        end: v.number(),
        isFiller: v.boolean(),
        isDeleted: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      transcript: args.transcript,
      status: "ready",
    });
  },
});
