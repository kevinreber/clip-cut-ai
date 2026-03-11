import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("compilations")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("compilations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const compilation = await ctx.db.get(args.id);
    if (!compilation || compilation.userId !== userId) return null;
    return compilation;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    sourceProjectIds: v.array(v.id("projects")),
    assemblyMode: v.union(
      v.literal("best-story"),
      v.literal("highlight-reel"),
      v.literal("chronological"),
      v.literal("custom")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (args.sourceProjectIds.length < 2) {
      throw new Error("Select at least 2 projects to combine.");
    }
    // Verify all projects belong to user
    for (const pid of args.sourceProjectIds) {
      const project = await ctx.db.get(pid);
      if (!project || project.userId !== userId) {
        throw new Error("Project not found or not owned by you.");
      }
    }
    return await ctx.db.insert("compilations", {
      userId,
      name: args.name,
      sourceProjectIds: args.sourceProjectIds,
      assemblyMode: args.assemblyMode,
      status: "selecting",
      createdAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("compilations"),
    status: v.union(
      v.literal("selecting"),
      v.literal("analyzing"),
      v.literal("reviewed"),
      v.literal("exporting"),
      v.literal("done")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const comp = await ctx.db.get(args.id);
    if (!comp || comp.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const saveAiSuggestion = mutation({
  args: {
    id: v.id("compilations"),
    aiSuggestion: v.object({
      narrativeSummary: v.string(),
      segments: v.array(
        v.object({
          projectId: v.id("projects"),
          projectName: v.string(),
          start: v.number(),
          end: v.number(),
          order: v.number(),
          reason: v.string(),
        })
      ),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const comp = await ctx.db.get(args.id);
    if (!comp || comp.userId !== userId) throw new Error("Not found");
    // Also initialize finalSequence from AI suggestion
    const finalSequence = args.aiSuggestion.segments.map((seg) => ({
      projectId: seg.projectId,
      projectName: seg.projectName,
      start: seg.start,
      end: seg.end,
      order: seg.order,
      included: true,
    }));
    await ctx.db.patch(args.id, {
      aiSuggestion: args.aiSuggestion,
      finalSequence,
      status: "reviewed",
    });
  },
});

export const updateFinalSequence = mutation({
  args: {
    id: v.id("compilations"),
    finalSequence: v.array(
      v.object({
        projectId: v.id("projects"),
        projectName: v.string(),
        start: v.number(),
        end: v.number(),
        order: v.number(),
        included: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const comp = await ctx.db.get(args.id);
    if (!comp || comp.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.id, { finalSequence: args.finalSequence });
  },
});

export const updateTransition = mutation({
  args: {
    id: v.id("compilations"),
    transition: v.union(
      v.literal("cut"),
      v.literal("crossfade"),
      v.literal("fade-to-black")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const comp = await ctx.db.get(args.id);
    if (!comp || comp.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.id, { transition: args.transition });
  },
});

export const deleteCompilation = mutation({
  args: { id: v.id("compilations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const comp = await ctx.db.get(args.id);
    if (!comp || comp.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});
