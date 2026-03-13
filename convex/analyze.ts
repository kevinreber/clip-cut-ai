"use node";

import { v, ConvexError } from "convex/values";
import { action } from "./_generated/server";
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

// Default minimum gap between words (in seconds) to flag as a silence
const DEFAULT_SILENCE_THRESHOLD = 2.0;

interface WhisperWord {
  word: string;
  start: number;
  end: number;
  confidence?: number;
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
  words: WhisperWord[],
  customFillerWords?: string[],
  silenceThreshold?: number
): Array<{
  word: string;
  start: number;
  end: number;
  isFiller: boolean;
  isDeleted: boolean;
  confidence?: number;
}> {
  const transcript: Array<{
    word: string;
    start: number;
    end: number;
    isFiller: boolean;
    isDeleted: boolean;
    confidence?: number;
  }> = [];

  // Merge custom filler words with defaults
  const allFillerWords = new Set(FILLER_WORDS);
  if (customFillerWords) {
    for (const w of customFillerWords) {
      allFillerWords.add(w.toLowerCase().trim());
    }
  }

  const isFillerWithCustom = (word: string): boolean => {
    const normalized = word.toLowerCase().replace(/[^a-z\s]/g, "").trim();
    return allFillerWords.has(normalized);
  };

  const repetitions = detectRepetitions(words);

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const isFiller = isFillerWithCustom(w.word) || repetitions.has(i);

    transcript.push({
      word: w.word.trim(),
      start: w.start,
      end: w.end,
      isFiller,
      isDeleted: false,
      confidence: w.confidence,
    });

    // Detect silences: insert a [silence] marker if gap > threshold
    const threshold = silenceThreshold ?? DEFAULT_SILENCE_THRESHOLD;
    if (i < words.length - 1) {
      const gap = words[i + 1].start - w.end;
      if (gap >= threshold) {
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
  args: {
    projectId: v.id("projects"),
    language: v.optional(v.string()),
    customFillerWords: v.optional(v.array(v.string())),
    silenceThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check for user's own API key first, then fall back to platform key
    let apiKey: string | null = null;
    let usingPlatformKey = false;

    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      const userKey = await ctx.runQuery(
        internal.userApiKeysHelpers.getApiKeyByUserId,
        { userId: identity.subject }
      );
      if (userKey) {
        apiKey = userKey;
      }
    }

    if (!apiKey) {
      apiKey = process.env.OPENAI_API_KEY ?? null;
      usingPlatformKey = true;
    }

    if (!apiKey) {
      throw new ConvexError(
        "No OpenAI API key available. Add your own key in Settings, " +
          "or contact the site admin."
      );
    }

    // Enforce budget when using the platform key
    if (usingPlatformKey && identity) {
      const { FREE_CREDIT_BUDGET, CREDIT_COSTS } = await import("./apiUsage");
      const usedCredits = await ctx.runQuery(
        internal.apiUsage.getUsedCredits,
        { userId: identity.subject }
      );
      const cost = CREDIT_COSTS.whisper;
      if (usedCredits + cost > FREE_CREDIT_BUDGET) {
        throw new ConvexError(
          "You've used all your free platform credits. " +
            "Add your own OpenAI API key in Settings to continue using ClipCut AI."
        );
      }
    }

    // Set status to analyzing
    await ctx.runMutation(internal.analyzeHelpers.setProjectStatus, {
      projectId: args.projectId,
      status: "analyzing",
    });

    try {
      // Get the project to find the video file
      const project = await ctx.runQuery(internal.analyzeHelpers.getProject, {
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
      if (args.language) {
        formData.append("language", args.language);
      }

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
        transcript = processTranscript(result.words, args.customFillerWords, args.silenceThreshold);
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
        transcript = processTranscript(segmentWords, args.customFillerWords, args.silenceThreshold);
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
      await ctx.runMutation(internal.analyzeHelpers.saveTranscript, {
        projectId: args.projectId,
        transcript,
      });

      // Record usage if using platform key
      if (usingPlatformKey && identity) {
        const { CREDIT_COSTS } = await import("./apiUsage");
        await ctx.runMutation(internal.apiUsage.recordUsage, {
          userId: identity.subject,
          action: "whisper",
          creditsUsed: CREDIT_COSTS.whisper,
        });
      }

      return { success: true, wordCount: transcript.length };
    } catch (error) {
      // On error, reset status to ready so user can retry
      await ctx.runMutation(internal.analyzeHelpers.setProjectStatus, {
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

