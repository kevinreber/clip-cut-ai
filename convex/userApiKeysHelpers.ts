import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const upsertApiKey = internalMutation({
  args: {
    userId: v.string(),
    openaiApiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        openaiApiKey: args.openaiApiKey,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userApiKeys", {
        userId: args.userId,
        openaiApiKey: args.openaiApiKey,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const getApiKeyByUserId = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("userApiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    return record?.openaiApiKey ?? null;
  },
});

export const hasApiKey = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const record = await ctx.db
      .query("userApiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!record) return false;
    // Return masked key for display
    const key = record.openaiApiKey;
    const masked = key.slice(0, 5) + "..." + key.slice(-4);
    return { hasSavedKey: true, maskedKey: masked };
  },
});

export const deleteApiKey = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const record = await ctx.db
      .query("userApiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (record) {
      await ctx.db.delete(record._id);
    }
  },
});
