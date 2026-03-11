import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const saveSummary = internalMutation({
  args: {
    projectId: v.id("projects"),
    summary: v.string(),
    showNotes: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      summary: args.summary,
      showNotes: args.showNotes,
    });
  },
});

export const saveChapters = internalMutation({
  args: {
    projectId: v.id("projects"),
    chapters: v.array(
      v.object({
        title: v.string(),
        start: v.number(),
        end: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      chapters: args.chapters,
    });
  },
});

export const saveSpeakers = internalMutation({
  args: {
    projectId: v.id("projects"),
    speakers: v.array(
      v.object({
        name: v.string(),
        color: v.string(),
        wordIndices: v.array(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      speakers: args.speakers,
    });
  },
});

export const saveClips = internalMutation({
  args: {
    projectId: v.id("projects"),
    clips: v.array(
      v.object({
        title: v.string(),
        description: v.string(),
        start: v.number(),
        end: v.number(),
        score: v.number(),
        tags: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      clips: args.clips,
    });
  },
});

export const saveTracks = internalMutation({
  args: {
    projectId: v.id("projects"),
    tracks: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        type: v.union(
          v.literal("video"),
          v.literal("audio"),
          v.literal("image"),
          v.literal("text")
        ),
        fileId: v.optional(v.id("_storage")),
        start: v.number(),
        end: v.number(),
        layer: v.number(),
        volume: v.optional(v.number()),
        opacity: v.optional(v.number()),
        text: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      tracks: args.tracks,
    });
  },
});

export const saveTtsSegments = internalMutation({
  args: {
    projectId: v.id("projects"),
    ttsSegments: v.array(
      v.object({
        id: v.string(),
        text: v.string(),
        start: v.number(),
        end: v.number(),
        voice: v.string(),
        status: v.union(
          v.literal("pending"),
          v.literal("generating"),
          v.literal("ready"),
          v.literal("error")
        ),
        audioFileId: v.optional(v.id("_storage")),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      ttsSegments: args.ttsSegments,
    });
  },
});

export const saveZoomRegions = internalMutation({
  args: {
    projectId: v.id("projects"),
    zoomRegions: v.array(
      v.object({
        id: v.string(),
        start: v.number(),
        end: v.number(),
        type: v.union(
          v.literal("zoom-in"),
          v.literal("zoom-out"),
          v.literal("pan"),
          v.literal("ken-burns")
        ),
        fromX: v.number(),
        fromY: v.number(),
        fromScale: v.number(),
        toX: v.number(),
        toY: v.number(),
        toScale: v.number(),
        aspectRatio: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      zoomRegions: args.zoomRegions,
    });
  },
});

export const saveRewriteSuggestions = internalMutation({
  args: {
    projectId: v.id("projects"),
    rewriteSuggestions: v.array(
      v.object({
        startIndex: v.number(),
        endIndex: v.number(),
        originalText: v.string(),
        suggestedText: v.string(),
        reason: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      rewriteSuggestions: args.rewriteSuggestions,
    });
  },
});
