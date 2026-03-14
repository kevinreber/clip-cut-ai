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

async function getOpenAIKey(ctx: any): Promise<{ apiKey: string; usingPlatformKey: boolean; userId: string | null }> {
  let apiKey: string | null = null;
  let usingPlatformKey = false;

  const identity = await ctx.auth.getUserIdentity();
  const userId = identity?.subject ?? null;

  if (identity) {
    const userKey = await ctx.runQuery(
      internal.userApiKeysHelpers.getApiKeyByUserId,
      { userId: identity.subject }
    );
    if (userKey) apiKey = userKey;
  }

  if (!apiKey) {
    apiKey = process.env.OPENAI_API_KEY ?? null;
    usingPlatformKey = true;
  }

  if (!apiKey) {
    throw new ConvexError(
      "No OpenAI API key available. Add your own key in Settings, or contact the site admin."
    );
  }

  return { apiKey, usingPlatformKey, userId };
}

async function checkAndRecordUsage(
  ctx: any,
  usingPlatformKey: boolean,
  userId: string | null,
  actionType: string,
  mode: "check" | "record"
): Promise<void> {
  if (!usingPlatformKey || !userId) return;

  const { FREE_CREDIT_BUDGET, CREDIT_COSTS } = await import("./apiUsage");
  const cost = CREDIT_COSTS[actionType] ?? 1;

  if (mode === "check") {
    const usedCredits = await ctx.runQuery(
      internal.apiUsage.getUsedCredits,
      { userId }
    );
    if (usedCredits + cost > FREE_CREDIT_BUDGET) {
      throw new ConvexError(
        "You've used all your free platform credits. " +
          "Add your own OpenAI API key in Settings to continue using ClipCut AI."
      );
    }
  } else {
    await ctx.runMutation(internal.apiUsage.recordUsage, {
      userId,
      action: actionType,
      creditsUsed: cost,
    });
  }
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
    const { apiKey, usingPlatformKey, userId } = await getOpenAIKey(ctx);
    await checkAndRecordUsage(ctx, usingPlatformKey, userId, "ai_feature", "check");

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

    await checkAndRecordUsage(ctx, usingPlatformKey, userId, "ai_feature", "record");
    return { success: true };
  },
});

export const identifySpeakers = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { apiKey, usingPlatformKey, userId } = await getOpenAIKey(ctx);
    await checkAndRecordUsage(ctx, usingPlatformKey, userId, "ai_feature", "check");

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

    await checkAndRecordUsage(ctx, usingPlatformKey, userId, "ai_feature", "record");
    return { success: true, speakerCount: speakers.length };
  },
});

export const extractClips = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { apiKey, usingPlatformKey, userId } = await getOpenAIKey(ctx);
    await checkAndRecordUsage(ctx, usingPlatformKey, userId, "ai_feature", "check");

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

    await checkAndRecordUsage(ctx, usingPlatformKey, userId, "ai_feature", "record");
    return { success: true, clipCount: clips.length };
  },
});

export const generateChapters = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { apiKey, usingPlatformKey, userId } = await getOpenAIKey(ctx);
    await checkAndRecordUsage(ctx, usingPlatformKey, userId, "ai_feature", "check");

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

    await checkAndRecordUsage(ctx, usingPlatformKey, userId, "ai_feature", "record");
    return { success: true, chapterCount: chapters.length };
  },
});

export const generateTtsForGap = action({
  args: {
    projectId: v.id("projects"),
    text: v.string(),
    voice: v.string(),
    start: v.number(),
    end: v.number(),
  },
  handler: async (ctx, args) => {
    const { apiKey, usingPlatformKey, userId } = await getOpenAIKey(ctx);
    await checkAndRecordUsage(ctx, usingPlatformKey, userId, "tts", "check");

    // Call OpenAI TTS API
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: args.text,
        voice: args.voice,
        response_format: "mp3",
        speed: 1.0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ConvexError(
        `OpenAI TTS API error (${response.status}): ${errorText}`
      );
    }

    // Store the audio file in Convex storage
    const audioBlob = await response.blob();
    const storageId = await ctx.storage.store(audioBlob);

    await checkAndRecordUsage(ctx, usingPlatformKey, userId, "tts", "record");
    return { storageId, success: true };
  },
});

export const suggestTtsGaps = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { apiKey, usingPlatformKey, userId } = await getOpenAIKey(ctx);
    await checkAndRecordUsage(ctx, usingPlatformKey, userId, "ai_feature", "check");

    const project = await ctx.runQuery(internal.analyzeHelpers.getProject, {
      id: args.projectId,
    });
    if (!project?.transcript || project.transcript.length === 0) {
      throw new ConvexError("No transcript available. Analyze the video first.");
    }

    // Find deleted segments with surrounding context
    const transcript = project.transcript;
    const gaps: Array<{
      startIndex: number;
      endIndex: number;
      beforeText: string;
      afterText: string;
      start: number;
      end: number;
    }> = [];

    let inDeletedRange = false;
    let rangeStart = -1;

    for (let i = 0; i < transcript.length; i++) {
      const w = transcript[i];
      if (w.isDeleted && !inDeletedRange) {
        inDeletedRange = true;
        rangeStart = i;
      } else if (!w.isDeleted && inDeletedRange) {
        inDeletedRange = false;
        // Get context: 5 words before and after
        const beforeWords = transcript
          .slice(Math.max(0, rangeStart - 5), rangeStart)
          .filter((w: TranscriptWord) => !w.isDeleted && !w.word.startsWith("[silence"))
          .map((w: TranscriptWord) => w.word)
          .join(" ");
        const afterWords = transcript
          .slice(i, Math.min(transcript.length, i + 5))
          .filter((w: TranscriptWord) => !w.isDeleted && !w.word.startsWith("[silence"))
          .map((w: TranscriptWord) => w.word)
          .join(" ");

        const gapStart = transcript[rangeStart].start;
        const gapEnd = transcript[i - 1].end;

        if (gapEnd - gapStart > 0.5 && beforeWords && afterWords) {
          gaps.push({
            startIndex: rangeStart,
            endIndex: i - 1,
            beforeText: beforeWords,
            afterText: afterWords,
            start: gapStart,
            end: gapEnd,
          });
        }
      }
    }

    if (gaps.length === 0) {
      return { suggestions: [] };
    }

    // Ask GPT to suggest bridging text for each gap
    const gapDescriptions = gaps
      .slice(0, 8) // Limit to 8 gaps
      .map(
        (g, i) =>
          `Gap ${i + 1} (${g.start.toFixed(1)}s-${g.end.toFixed(1)}s): Before: "${g.beforeText}" → After: "${g.afterText}"`
      )
      .join("\n");

    const systemPrompt = `You are an expert speech writer. Given gaps in a transcript where words were deleted, suggest short bridging phrases that smoothly connect the remaining text. The phrases should sound natural and match the speaker's style.

Rules:
- Keep bridging text very short (2-8 words)
- Make it sound like natural speech, not written prose
- If the gap can be bridged with just a connecting word (and, so, then), use that
- Some gaps may not need bridging — return empty string for those

Respond with ONLY a JSON array of bridging texts, one per gap:
["bridging text 1", "bridging text 2", ...]

Only output the JSON array.`;

    const result = await callChatGPT(apiKey, systemPrompt, gapDescriptions);

    let bridgingTexts: string[];
    try {
      const jsonStr = result.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      bridgingTexts = JSON.parse(jsonStr);
    } catch {
      throw new ConvexError("Failed to parse TTS gap suggestions from AI response.");
    }

    const suggestions = gaps.slice(0, 8).map((g, i) => ({
      id: `tts-${Date.now()}-${i}`,
      text: bridgingTexts[i] || "",
      start: g.start,
      end: g.end,
      voice: "alloy",
      status: "pending" as const,
    })).filter(s => s.text.length > 0);

    await checkAndRecordUsage(ctx, usingPlatformKey, userId, "ai_feature", "record");
    return { suggestions };
  },
});

export const detectZoomRegions = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { apiKey, usingPlatformKey, userId } = await getOpenAIKey(ctx);
    await checkAndRecordUsage(ctx, usingPlatformKey, userId, "ai_feature", "check");

    const project = await ctx.runQuery(internal.analyzeHelpers.getProject, {
      id: args.projectId,
    });
    if (!project?.transcript || project.transcript.length === 0) {
      throw new ConvexError("No transcript available. Analyze the video first.");
    }

    const timestampedText = transcriptToTimestampedText(project.transcript);

    const systemPrompt = `You are an expert video editor specializing in dynamic zoom and reframing effects. Given a timestamped transcript, identify the best moments for zoom effects to make the video more engaging.

Consider:
- Zoom in on key points, revelations, or emphatic statements
- Ken Burns effect for longer descriptive sections
- Zoom out for context-setting or concluding statements
- Pan effects for transitions between topics

For each region, provide:
- start: Start time in seconds
- end: End time in seconds
- type: One of "zoom-in", "zoom-out", "pan", "ken-burns"
- reason: Brief explanation

Rules:
- Suggest 3-8 zoom regions depending on video length
- Each region should be 2-15 seconds long
- Don't overlap regions
- Space them out for visual variety

Respond with ONLY a JSON array:
[{"start": 10.5, "end": 15.2, "type": "zoom-in", "reason": "Key insight moment"}]

Only output the JSON array.`;

    const result = await callChatGPT(apiKey, systemPrompt, timestampedText);

    let regionsRaw: Array<{
      start: number;
      end: number;
      type: "zoom-in" | "zoom-out" | "pan" | "ken-burns";
      reason: string;
    }>;
    try {
      const jsonStr = result.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      regionsRaw = JSON.parse(jsonStr);
    } catch {
      throw new ConvexError("Failed to parse zoom region data from AI response.");
    }

    if (!Array.isArray(regionsRaw) || regionsRaw.length === 0) {
      throw new ConvexError("AI did not identify any zoom regions.");
    }

    // Generate zoom parameters based on type
    const regions = regionsRaw.map((r, i) => {
      const defaults = {
        "zoom-in": { fromScale: 1.0, toScale: 1.4, fromX: 0.5, fromY: 0.5, toX: 0.5, toY: 0.4 },
        "zoom-out": { fromScale: 1.4, toScale: 1.0, fromX: 0.5, fromY: 0.4, toX: 0.5, toY: 0.5 },
        "pan": { fromScale: 1.2, toScale: 1.2, fromX: 0.3, fromY: 0.5, toX: 0.7, toY: 0.5 },
        "ken-burns": { fromScale: 1.0, toScale: 1.3, fromX: 0.3, fromY: 0.3, toX: 0.7, toY: 0.6 },
      };
      const d = defaults[r.type] || defaults["zoom-in"];
      return {
        id: `zoom-${Date.now()}-${i}`,
        start: r.start,
        end: r.end,
        type: r.type,
        fromX: d.fromX,
        fromY: d.fromY,
        fromScale: d.fromScale,
        toX: d.toX,
        toY: d.toY,
        toScale: d.toScale,
      };
    });

    await ctx.runMutation(internal.aiFeatureHelpers.saveZoomRegions, {
      projectId: args.projectId,
      zoomRegions: regions,
    });

    await checkAndRecordUsage(ctx, usingPlatformKey, userId, "ai_feature", "record");
    return { success: true, regionCount: regions.length };
  },
});

export const generateRewriteSuggestions = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { apiKey, usingPlatformKey, userId } = await getOpenAIKey(ctx);
    await checkAndRecordUsage(ctx, usingPlatformKey, userId, "ai_feature", "check");

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

    await checkAndRecordUsage(ctx, usingPlatformKey, userId, "ai_feature", "record");
    return { success: true, suggestionCount: suggestions.length };
  },
});

export const repurposeContent = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { apiKey, usingPlatformKey, userId } = await getOpenAIKey(ctx);
    await checkAndRecordUsage(ctx, usingPlatformKey, userId, "ai_feature", "check");

    const project = await ctx.runQuery(internal.analyzeHelpers.getProject, {
      id: args.projectId,
    });
    if (!project?.transcript || project.transcript.length === 0) {
      throw new ConvexError("No transcript available. Analyze the video first.");
    }

    const text = transcriptToText(project.transcript);

    // Use summary & chapters if available for richer context
    const contextParts = [`Transcript:\n${text}`];
    if (project.summary) {
      contextParts.push(`Existing Summary:\n${project.summary}`);
    }
    if (project.chapters && project.chapters.length > 0) {
      const chaptersText = project.chapters
        .map((c: { title: string; start: number }) => `- ${formatTs(c.start)} ${c.title}`)
        .join("\n");
      contextParts.push(`Chapters:\n${chaptersText}`);
    }
    const fullContext = contextParts.join("\n\n---\n\n");

    const systemPrompt = `You are an expert content strategist who repurposes video content into multiple formats. Given a video transcript (and optionally a summary and chapters), generate all of the following formats.

Respond with ONLY a JSON object (no markdown fences), with these exact keys:

{
  "blogPost": "A well-structured blog post (300-600 words) with a compelling title as the first line (prefixed with '# '), subheadings (prefixed with '## '), and paragraphs. Write in the speaker's voice. Include key insights and actionable takeaways.",
  "linkedinPost": "A professional LinkedIn post (150-250 words). Start with a hook line. Use short paragraphs. End with a question or call-to-action. Include 3-5 relevant hashtags at the end.",
  "twitterThread": "A Twitter/X thread of 4-8 tweets. Format each tweet on its own line, prefixed with the tweet number (e.g., '1/ ', '2/ '). First tweet should hook the reader. Last tweet should summarize or link back. Each tweet must be under 280 characters.",
  "newsletterSnippet": "An email newsletter section (100-200 words). Start with a brief intro sentence, then 3-5 bullet points of key takeaways, then a closing sentence encouraging readers to watch the full video.",
  "youtubeDescription": "A YouTube video description (150-300 words). Include: a 2-sentence hook, key topics covered (bulleted), timestamps if chapters are available, and a call-to-action to like/subscribe."
}

Rules:
- Preserve the speaker's tone and style
- Each format should stand alone — don't reference the other formats
- Focus on the most compelling and valuable content
- Make each format platform-appropriate (LinkedIn is professional, Twitter is punchy, etc.)
- Only output the JSON object, nothing else`;

    const result = await callChatGPT(apiKey, systemPrompt, fullContext);

    let parsed: {
      blogPost: string;
      linkedinPost: string;
      twitterThread: string;
      newsletterSnippet: string;
      youtubeDescription: string;
    };
    try {
      const jsonStr = result.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new ConvexError("Failed to parse repurposed content from AI response.");
    }

    if (!parsed.blogPost || !parsed.linkedinPost || !parsed.twitterThread) {
      throw new ConvexError("AI did not generate all required content formats.");
    }

    const repurposeContent = {
      blogPost: parsed.blogPost,
      linkedinPost: parsed.linkedinPost,
      twitterThread: parsed.twitterThread,
      newsletterSnippet: parsed.newsletterSnippet || "",
      youtubeDescription: parsed.youtubeDescription || "",
      generatedAt: Date.now(),
    };

    await ctx.runMutation(internal.aiFeatureHelpers.saveRepurposeContent, {
      projectId: args.projectId,
      repurposeContent,
    });

    await checkAndRecordUsage(ctx, usingPlatformKey, userId, "ai_feature", "record");
    return { success: true };
  },
});
