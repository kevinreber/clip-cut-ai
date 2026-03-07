"use node";

import { v } from "convex/values";
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

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const isFiller = isFillerWord(w.word);

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
      throw new Error(
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
        throw new Error("Project not found or has no video file.");
      }

      // Get the video blob from storage
      const videoBlob = await ctx.storage.get(project.videoFileId);
      if (!videoBlob) {
        throw new Error("Video file not found in storage.");
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
        throw new Error(
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
      throw error;
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
