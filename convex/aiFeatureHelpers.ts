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
