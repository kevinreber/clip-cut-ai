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
