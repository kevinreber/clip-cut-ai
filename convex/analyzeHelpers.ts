import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

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
        confidence: v.optional(v.number()),
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
