import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("cleanupPresets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const listCommunity = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("cleanupPresets")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .order("desc")
      .collect();
  },
});

export const save = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    category: v.string(),
    silenceThreshold: v.number(),
    customFillerWords: v.array(v.string()),
    confidenceThreshold: v.number(),
    removeFillers: v.boolean(),
    removeSilences: v.boolean(),
    shortenSilences: v.boolean(),
    shortenSilenceTarget: v.number(),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("cleanupPresets", {
      userId,
      ...args,
      usageCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("cleanupPresets") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const preset = await ctx.db.get(args.id);
    if (!preset || preset.userId !== userId) {
      throw new Error("Preset not found");
    }
    await ctx.db.delete(args.id);
  },
});

export const incrementUsage = mutation({
  args: { id: v.id("cleanupPresets") },
  handler: async (ctx, args) => {
    const preset = await ctx.db.get(args.id);
    if (!preset) return;
    await ctx.db.patch(args.id, {
      usageCount: preset.usageCount + 1,
    });
  },
});
