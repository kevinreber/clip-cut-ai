"use node";

import { v, ConvexError } from "convex/values";
import { action } from "./_generated/server";
import { internal, api } from "./_generated/api";

interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  isFiller: boolean;
  isDeleted: boolean;
  confidence?: number;
}

function transcriptToTimestampedText(transcript: TranscriptWord[]): string {
  const lines: string[] = [];
  let currentLine = "";
  let lineStart = -1;

  for (const w of transcript) {
    if (w.word.startsWith("[silence")) continue;
    if (lineStart < 0) lineStart = w.start;
    currentLine += (currentLine ? " " : "") + w.word;
    const wordCount = currentLine.split(/\s+/).length;
    if (wordCount >= 15) {
      lines.push(`[${formatTs(lineStart)}] ${currentLine}`);
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
      temperature: 0.4,
      max_tokens: 3000,
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

export const analyzeForAssembly = action({
  args: {
    compilationId: v.id("compilations"),
  },
  handler: async (ctx, args) => {
    const apiKey = await getOpenAIKey(ctx);

    // Get the compilation
    const compilation = await ctx.runQuery(api.compilations.get, {
      id: args.compilationId,
    });
    if (!compilation) {
      throw new ConvexError("Compilation not found.");
    }

    // Set status to analyzing
    await ctx.runMutation(api.compilations.updateStatus, {
      id: args.compilationId,
      status: "analyzing",
    });

    // Fetch all source project transcripts
    const projectData: Array<{
      id: string;
      name: string;
      transcript: string;
      duration: number;
      summary?: string;
    }> = [];

    for (const projectId of compilation.sourceProjectIds) {
      const project = await ctx.runQuery(internal.analyzeHelpers.getProject, {
        id: projectId,
      });
      if (!project?.transcript || project.transcript.length === 0) {
        continue;
      }
      const lastWord = project.transcript[project.transcript.length - 1];
      projectData.push({
        id: projectId,
        name: project.name,
        transcript: transcriptToTimestampedText(project.transcript),
        duration: lastWord.end,
        summary: project.summary,
      });
    }

    if (projectData.length < 2) {
      throw new ConvexError(
        "At least 2 projects with transcripts are required. Analyze your videos first."
      );
    }

    // Build the user prompt with all transcripts
    const userPrompt = projectData
      .map(
        (p, i) =>
          `--- VIDEO ${i + 1}: "${p.name}" (duration: ${formatTs(p.duration)}) ---\n${p.summary ? `Summary: ${p.summary}\n` : ""}Transcript:\n${p.transcript}`
      )
      .join("\n\n");

    let systemPrompt: string;

    if (compilation.assemblyMode === "highlight-reel") {
      systemPrompt = `You are an expert video editor creating a highlight reel from multiple video clips.

Given timestamped transcripts from multiple videos, identify the top 4-10 best moments across all videos. Pick the most engaging, insightful, funny, or emotionally compelling segments.

For each selected segment:
- Pick a specific time range (15-90 seconds each) from a specific video
- Score it by engagement quality
- Order segments to flow naturally (strong opener, build energy, strong closer)

Respond with ONLY valid JSON (no markdown, no code blocks):
{"narrativeSummary": "A 2-3 sentence description of the highlight reel", "segments": [{"videoIndex": 0, "start": 10.5, "end": 45.2, "order": 1, "reason": "Strong hook moment"}, ...]}

The "videoIndex" is 0-based matching the video order provided. Only output the JSON.`;
    } else if (compilation.assemblyMode === "chronological") {
      systemPrompt = `You are an expert video editor assembling multiple clips in chronological/sequential order.

Given timestamped transcripts from multiple videos, keep them in the order provided but suggest trimming weak openings and endings for each clip to create tighter pacing.

For each video, suggest the best start and end trim points to remove:
- Weak intros ("so um, ok, let me start by...")
- Trailing silences or filler-heavy endings
- Repetitive sections

Respond with ONLY valid JSON (no markdown, no code blocks):
{"narrativeSummary": "A 2-3 sentence description of the assembled content", "segments": [{"videoIndex": 0, "start": 2.5, "end": 120.0, "order": 1, "reason": "Trimmed weak intro"}, ...]}

One segment per video, in order. The "videoIndex" is 0-based. Only output the JSON.`;
    } else {
      // best-story or custom
      systemPrompt = `You are an expert video editor and storyteller. Given timestamped transcripts from multiple video clips, analyze all content and suggest the best way to combine them into a single cohesive narrative.

Your tasks:
1. Identify the key themes and topics across all clips
2. Propose an optimal ordering of segments for the most compelling story
3. For each clip, suggest specific start/end trim points to remove weak openings/closings
4. You may select multiple segments from the same video if needed
5. Order the segments to create a natural narrative arc (hook → context → development → conclusion)

Rules:
- Each segment should be 10-180 seconds long
- Suggest 3-12 segments total depending on content
- Every source video should contribute at least one segment
- Avoid including filler-heavy sections

Respond with ONLY valid JSON (no markdown, no code blocks):
{"narrativeSummary": "A 2-3 sentence summary of the assembled story and why this ordering works", "segments": [{"videoIndex": 0, "start": 5.0, "end": 60.5, "order": 1, "reason": "Opens with a strong hook about..."}, ...]}

The "videoIndex" is 0-based matching the video order provided. Only output the JSON.`;
    }

    const result = await callChatGPT(apiKey, systemPrompt, userPrompt);

    // Parse AI response
    let parsed: {
      narrativeSummary: string;
      segments: Array<{
        videoIndex: number;
        start: number;
        end: number;
        order: number;
        reason: string;
      }>;
    };
    try {
      const jsonStr = result
        .replace(/```json?\s*/g, "")
        .replace(/```/g, "")
        .trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new ConvexError("Failed to parse AI assembly suggestion.");
    }

    if (
      !parsed.segments ||
      !Array.isArray(parsed.segments) ||
      parsed.segments.length === 0
    ) {
      throw new ConvexError("AI did not generate valid assembly segments.");
    }

    // Map videoIndex back to projectId
    const aiSuggestion = {
      narrativeSummary: parsed.narrativeSummary || "AI-assembled compilation",
      segments: parsed.segments
        .filter((s) => s.videoIndex >= 0 && s.videoIndex < projectData.length)
        .map((s) => ({
          projectId: projectData[s.videoIndex].id as any,
          projectName: projectData[s.videoIndex].name,
          start: s.start,
          end: s.end,
          order: s.order,
          reason: s.reason || "",
        })),
    };

    // Save the suggestion
    await ctx.runMutation(api.compilations.saveAiSuggestion, {
      id: args.compilationId,
      aiSuggestion,
    });

    return {
      success: true,
      segmentCount: aiSuggestion.segments.length,
    };
  },
});
