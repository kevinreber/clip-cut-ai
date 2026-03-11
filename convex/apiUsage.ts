import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Free platform credits per user (lifetime budget when using the shared key)
export const FREE_CREDIT_BUDGET = 15;

// Credit costs per action type
export const CREDIT_COSTS: Record<string, number> = {
  whisper: 3, // Transcription is the most expensive
  ai_feature: 1, // GPT-4o-mini calls (summary, chapters, speakers, clips, rewrite, zoom)
  tts: 2, // Text-to-speech generation
  compilation: 2, // Multi-video AI assembly
};

// Internal query: get total credits used by a user
export const getUsedCredits = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("apiUsage")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    return records.reduce((sum, r) => sum + r.creditsUsed, 0);
  },
});

// Internal mutation: record usage
export const recordUsage = internalMutation({
  args: {
    userId: v.string(),
    action: v.string(),
    creditsUsed: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("apiUsage", {
      userId: args.userId,
      action: args.action,
      creditsUsed: args.creditsUsed,
      createdAt: Date.now(),
    });
  },
});

// Public query: get current user's budget status
export const getBudgetStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Check if user has their own API key (BYOK users have unlimited access)
    const apiKeyRecord = await ctx.db
      .query("userApiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (apiKeyRecord) {
      return {
        hasOwnKey: true,
        creditsUsed: 0,
        creditsRemaining: Infinity,
        totalBudget: FREE_CREDIT_BUDGET,
      };
    }

    // Calculate used credits
    const records = await ctx.db
      .query("apiUsage")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const creditsUsed = records.reduce((sum, r) => sum + r.creditsUsed, 0);

    return {
      hasOwnKey: false,
      creditsUsed,
      creditsRemaining: Math.max(0, FREE_CREDIT_BUDGET - creditsUsed),
      totalBudget: FREE_CREDIT_BUDGET,
    };
  },
});
