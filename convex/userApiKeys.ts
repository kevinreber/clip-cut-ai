"use node";

import { v, ConvexError } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

export const validateAndSaveOpenAIKey = action({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");
    const userId = identity.subject;

    const key = args.apiKey.trim();
    if (!key.startsWith("sk-")) {
      throw new ConvexError(
        "Invalid API key format. OpenAI keys start with 'sk-'."
      );
    }

    // Validate the key with a lightweight API call
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new ConvexError(
          "Invalid API key. Please check your key and try again."
        );
      }
      throw new ConvexError(
        `Failed to validate API key (HTTP ${response.status}). Please try again.`
      );
    }

    // Save or update the key
    await ctx.runMutation(internal.userApiKeysHelpers.upsertApiKey, {
      userId,
      openaiApiKey: key,
    });

    return { success: true };
  },
});
