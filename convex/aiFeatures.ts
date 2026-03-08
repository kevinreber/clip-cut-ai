"use node";

import { v, ConvexError } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  isFiller: boolean;
  isDeleted: boolean;
  confidence?: number;
}

function transcriptToText(transcript: TranscriptWord[]): string {
  return transcript
    .filter((w) => !w.word.startsWith("[silence"))
    .map((w) => w.word)
    .join(" ");
}

function transcriptToTimestampedText(transcript: TranscriptWord[]): string {
  const lines: string[] = [];
  let currentLine = "";
  let lineStart = -1;

  for (const w of transcript) {
    if (w.word.startsWith("[silence")) continue;

    if (lineStart < 0) lineStart = w.start;
    currentLine += (currentLine ? " " : "") + w.word;

    // Break into ~15-word lines for context
    const wordCount = currentLine.split(/\s+/).length;
    if (wordCount >= 15) {
      const ts = formatTs(lineStart);
      lines.push(`[${ts}] ${currentLine}`);
      currentLine = "";
      lineStart = -1;
    }
  }
  if (currentLine) {
    lines.push(`[${formatTs(lineStart)}] ${currentLine}`);
  }
  return lines.join("\n");
}

function formatTs(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function getOpenAIKey(ctx: any): Promise<string> {
  let apiKey: string | null = null;

  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    const userKey = await ctx.runQuery(
      internal.userApiKeysHelpers.getApiKeyByUserId,
      { userId: identity.subject }
    );
    if (userKey) apiKey = userKey;
  }

  if (!apiKey) {
    apiKey = process.env.OPENAI_API_KEY ?? null;
  }

  if (!apiKey) {
    throw new ConvexError(
      "No OpenAI API key available. Add your own key in Settings, or contact the site admin."
    );
  }

  return apiKey;
}

async function callChatGPT(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ConvexError(
      `OpenAI API error (${response.status}): ${errorText}`
    );
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content ?? "";
}

export const generateSummary = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const apiKey = await getOpenAIKey(ctx);

    const project = await ctx.runQuery(internal.analyzeHelpers.getProject, {
      id: args.projectId,
    });
    if (!project?.transcript || project.transcript.length === 0) {
      throw new ConvexError("No transcript available. Analyze the video first.");
    }

    const text = transcriptToText(project.transcript);

    const systemPrompt = `You are an expert content summarizer. Given a video transcript, generate:
1. A concise summary (2-4 sentences)
2. Show notes in markdown format with:
   - Key Topics (bulleted list)
   - Key Takeaways (bulleted list)
   - Notable Quotes (if any interesting quotes appear, bulleted list with the quote)

Format your response exactly as:
## Summary
<summary text>

## Key Topics
- <topic 1>
- <topic 2>
...

## Key Takeaways
- <takeaway 1>
- <takeaway 2>
...

## Notable Quotes
- "<quote>"
...

If there are no notable quotes, omit that section. Keep it concise and useful.`;

    const result = await callChatGPT(apiKey, systemPrompt, text);

    // Extract summary (first section) and full show notes
    const summaryMatch = result.match(/## Summary\s*\n([\s\S]*?)(?=\n## |$)/);
    const summary = summaryMatch ? summaryMatch[1].trim() : result.split("\n\n")[0];

    await ctx.runMutation(internal.aiFeatureHelpers.saveSummary, {
      projectId: args.projectId,
      summary,
      showNotes: result,
    });

    return { success: true };
  },
});

export const identifySpeakers = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const apiKey = await getOpenAIKey(ctx);

    const project = await ctx.runQuery(internal.analyzeHelpers.getProject, {
      id: args.projectId,
    });
    if (!project?.transcript || project.transcript.length === 0) {
      throw new ConvexError("No transcript available. Analyze the video first.");
    }

    // Build timestamped transcript with word indices for GPT
    const indexedLines: string[] = [];
    let currentLine = "";
    let lineStartIdx = -1;
    let lineStart = -1;

    const realWords = project.transcript
      .map((w: TranscriptWord, i: number) => ({ ...w, originalIndex: i }))
      .filter((w: TranscriptWord & { originalIndex: number }) => !w.word.startsWith("[silence"));

    for (let i = 0; i < realWords.length; i++) {
      const w = realWords[i];
      if (lineStartIdx < 0) {
        lineStartIdx = w.originalIndex;
        lineStart = w.start;
      }
      currentLine += (currentLine ? " " : "") + w.word;

      const wordCount = currentLine.split(/\s+/).length;
      if (wordCount >= 20 || i === realWords.length - 1) {
        const ts = formatTs(lineStart);
        indexedLines.push(`[${ts}] (words ${lineStartIdx}-${w.originalIndex}) ${currentLine}`);
        currentLine = "";
        lineStartIdx = -1;
        lineStart = -1;
      }
    }
    const indexedText = indexedLines.join("\n");

    const systemPrompt = `You are an expert at speaker diarization. Given a timestamped transcript with word index ranges, identify distinct speakers and assign word ranges to each speaker.

Rules:
- Identify 2-6 speakers based on conversation patterns, topic shifts, and speaking styles
- If it appears to be a single speaker (monologue), return just 1 speaker
- Assign a descriptive name to each speaker (e.g., "Host", "Guest", "Interviewer", "Speaker 1")
- Every word range must be assigned to exactly one speaker
- Use the word index ranges from the transcript to assign ownership
- Speaker changes typically occur at natural pauses or topic shifts

Respond with ONLY a JSON array, no other text:
[{"name": "Host", "ranges": [[0, 45], [90, 120]]}, {"name": "Guest", "ranges": [[46, 89], [121, 200]]}]

Each range is [startWordIndex, endWordIndex] inclusive. Only output the JSON array.`;

    const result = await callChatGPT(apiKey, systemPrompt, indexedText);

    let speakersRaw: Array<{ name: string; ranges: number[][] }>;
    try {
      const jsonStr = result.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      speakersRaw = JSON.parse(jsonStr);
    } catch {
      throw new ConvexError("Failed to parse speaker data from AI response.");
    }

    if (!Array.isArray(speakersRaw) || speakersRaw.length === 0) {
      throw new ConvexError("AI did not identify any speakers.");
    }

    // Assign colors to speakers
    const SPEAKER_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
    const speakers = speakersRaw.map((s, i) => {
      const wordIndices: number[] = [];
      for (const [start, end] of s.ranges) {
        for (let idx = start; idx <= end && idx < project.transcript!.length; idx++) {
          wordIndices.push(idx);
        }
      }
      return {
        name: s.name,
        color: SPEAKER_COLORS[i % SPEAKER_COLORS.length],
        wordIndices,
      };
    });

    await ctx.runMutation(internal.aiFeatureHelpers.saveSpeakers, {
      projectId: args.projectId,
      speakers,
    });

    return { success: true, speakerCount: speakers.length };
  },
});

export const extractClips = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const apiKey = await getOpenAIKey(ctx);

    const project = await ctx.runQuery(internal.analyzeHelpers.getProject, {
      id: args.projectId,
    });
    if (!project?.transcript || project.transcript.length === 0) {
      throw new ConvexError("No transcript available. Analyze the video first.");
    }

    const timestampedText = transcriptToTimestampedText(project.transcript);

    const systemPrompt = `You are an expert at identifying the best clips from video content for social media (TikTok, Reels, Shorts).

Given a timestamped transcript, find the 3-6 best clips. Each clip should be:
- 15-90 seconds long (ideal for short-form social media)
- A complete thought or story (don't cut mid-sentence)
- Engaging, insightful, funny, or emotionally compelling
- Self-contained (makes sense without additional context)

For each clip, provide:
- title: A catchy title (3-8 words)
- description: Why this clip is compelling (1 sentence)
- start: Start time in seconds
- end: End time in seconds
- score: Quality score 1-10 (10 = viral potential)
- tags: 1-3 content tags (e.g., "funny", "insightful", "educational")

Respond with ONLY a JSON array, no other text:
[{"title": "The Key Insight", "description": "A compelling moment where...", "start": 30.5, "end": 75.2, "score": 8, "tags": ["insightful", "educational"]}]

Only output the JSON array.`;

    const result = await callChatGPT(apiKey, systemPrompt, timestampedText);

    let clipsRaw: Array<{
      title: string;
      description: string;
      start: number;
      end: number;
      score: number;
      tags: string[];
    }>;
    try {
      const jsonStr = result.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      clipsRaw = JSON.parse(jsonStr);
    } catch {
      throw new ConvexError("Failed to parse clip data from AI response.");
    }

    if (!Array.isArray(clipsRaw) || clipsRaw.length === 0) {
      throw new ConvexError("AI did not identify any clips.");
    }

    // Sort by score descending
    const clips = clipsRaw
      .map((c) => ({
        title: c.title,
        description: c.description,
        start: c.start,
        end: c.end,
        score: Math.min(10, Math.max(1, c.score)),
        tags: c.tags || [],
      }))
      .sort((a, b) => b.score - a.score);

    await ctx.runMutation(internal.aiFeatureHelpers.saveClips, {
      projectId: args.projectId,
      clips,
    });

    return { success: true, clipCount: clips.length };
  },
});

export const generateChapters = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const apiKey = await getOpenAIKey(ctx);

    const project = await ctx.runQuery(internal.analyzeHelpers.getProject, {
      id: args.projectId,
    });
    if (!project?.transcript || project.transcript.length === 0) {
      throw new ConvexError("No transcript available. Analyze the video first.");
    }

    const timestampedText = transcriptToTimestampedText(project.transcript);

    const systemPrompt = `You are an expert at creating video chapters. Given a timestamped transcript, identify logical topic boundaries and create chapters.

Rules:
- Create 3-8 chapters depending on content length
- Each chapter title should be concise (3-7 words)
- First chapter should start at 0:00
- Chapters should represent meaningful topic shifts, not arbitrary time divisions
- Use the timestamps from the transcript to set accurate start times

Respond with ONLY a JSON array, no other text:
[{"title": "Introduction", "start": 0}, {"title": "Chapter Title", "start": 65.2}, ...]

The "start" value should be in seconds (a number). Only output the JSON array.`;

    const result = await callChatGPT(apiKey, systemPrompt, timestampedText);

    // Parse the JSON response
    let chaptersRaw: Array<{ title: string; start: number }>;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonStr = result.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      chaptersRaw = JSON.parse(jsonStr);
    } catch {
      throw new ConvexError("Failed to parse chapter data from AI response.");
    }

    if (!Array.isArray(chaptersRaw) || chaptersRaw.length === 0) {
      throw new ConvexError("AI did not generate valid chapters.");
    }

    // Calculate end times (each chapter ends where the next begins)
    const lastWord = project.transcript[project.transcript.length - 1];
    const videoDuration = lastWord.end;

    const chapters = chaptersRaw.map((ch, i) => ({
      title: ch.title,
      start: ch.start,
      end: i < chaptersRaw.length - 1 ? chaptersRaw[i + 1].start : videoDuration,
    }));

    await ctx.runMutation(internal.aiFeatureHelpers.saveChapters, {
      projectId: args.projectId,
      chapters,
    });

    return { success: true, chapterCount: chapters.length };
  },
});

export const generateRewriteSuggestions = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const apiKey = await getOpenAIKey(ctx);

    const project = await ctx.runQuery(internal.analyzeHelpers.getProject, {
      id: args.projectId,
    });
    if (!project?.transcript || project.transcript.length === 0) {
      throw new ConvexError("No transcript available. Analyze the video first.");
    }

    // Build indexed transcript showing filler-heavy sections
    const indexedLines: string[] = [];
    const words = project.transcript;
    const CHUNK_SIZE = 30;

    for (let i = 0; i < words.length; i += CHUNK_SIZE) {
      const chunk = words.slice(i, i + CHUNK_SIZE);
      const fillerCount = chunk.filter(
        (w: TranscriptWord) => w.isFiller && !w.word.startsWith("[silence")
      ).length;
      const text = chunk
        .filter((w: TranscriptWord) => !w.word.startsWith("[silence"))
        .map((w: TranscriptWord) => w.word)
        .join(" ");

      if (text.trim()) {
        indexedLines.push(
          `[words ${i}-${Math.min(i + CHUNK_SIZE - 1, words.length - 1)}] (${fillerCount} fillers) ${text}`
        );
      }
    }

    const indexedText = indexedLines.join("\n");

    const systemPrompt = `You are an expert speech coach and transcript editor. Given a transcript with word index ranges and filler counts, find sections that would benefit from rewriting.

Focus on:
- Sections with heavy filler usage (um, uh, like, you know)
- Run-on or unclear sentences
- Repetitive phrasing
- Sections where the speaker struggled to articulate a point

For each suggestion, provide:
- startIndex: The word index where the problematic section starts
- endIndex: The word index where it ends
- originalText: The exact text from the transcript
- suggestedText: A cleaner rephrasing that preserves the speaker's intent
- reason: A brief explanation of why the rewrite is better

Rules:
- Provide 3-8 suggestions, prioritized by impact
- Keep the speaker's voice and style — don't make it sound robotic
- Only suggest rewrites where there's a meaningful improvement
- The suggestedText should be concise but natural-sounding

Respond with ONLY a JSON array, no other text:
[{"startIndex": 0, "endIndex": 25, "originalText": "so um like I think that uh", "suggestedText": "I think that", "reason": "Removes filler words for clearer delivery"}]

Only output the JSON array.`;

    const result = await callChatGPT(apiKey, systemPrompt, indexedText);

    let suggestionsRaw: Array<{
      startIndex: number;
      endIndex: number;
      originalText: string;
      suggestedText: string;
      reason: string;
    }>;
    try {
      const jsonStr = result
        .replace(/```json?\s*/g, "")
        .replace(/```/g, "")
        .trim();
      suggestionsRaw = JSON.parse(jsonStr);
    } catch {
      throw new ConvexError(
        "Failed to parse rewrite suggestions from AI response."
      );
    }

    if (!Array.isArray(suggestionsRaw)) {
      throw new ConvexError("AI did not generate valid suggestions.");
    }

    // Validate and clean suggestions
    const suggestions = suggestionsRaw
      .filter(
        (s) =>
          typeof s.startIndex === "number" &&
          typeof s.endIndex === "number" &&
          s.startIndex >= 0 &&
          s.endIndex < words.length &&
          s.originalText &&
          s.suggestedText
      )
      .map((s) => ({
        startIndex: s.startIndex,
        endIndex: s.endIndex,
        originalText: s.originalText,
        suggestedText: s.suggestedText,
        reason: s.reason || "Cleaner phrasing",
      }));

    await ctx.runMutation(internal.aiFeatureHelpers.saveRewriteSuggestions, {
      projectId: args.projectId,
      rewriteSuggestions: suggestions,
    });

    return { success: true, suggestionCount: suggestions.length };
  },
});
