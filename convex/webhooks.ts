import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

function generateSecret(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "whsec_";
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("webhooks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const add = mutation({
  args: {
    url: v.string(),
    events: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Validate URL
    try {
      new URL(args.url);
    } catch {
      throw new Error("Invalid webhook URL");
    }

    // Validate events
    const validEvents = ["export.completed", "project.analyzed", "project.created"];
    for (const event of args.events) {
      if (!validEvents.includes(event)) {
        throw new Error(`Invalid event: ${event}`);
      }
    }

    return await ctx.db.insert("webhooks", {
      userId,
      url: args.url,
      events: args.events,
      active: true,
      secret: generateSecret(),
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("webhooks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const webhook = await ctx.db.get(args.id);
    if (!webhook || webhook.userId !== userId) {
      throw new Error("Webhook not found");
    }
    await ctx.db.delete(args.id);
  },
});

export const toggle = mutation({
  args: {
    id: v.id("webhooks"),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const webhook = await ctx.db.get(args.id);
    if (!webhook || webhook.userId !== userId) {
      throw new Error("Webhook not found");
    }
    await ctx.db.patch(args.id, { active: args.active });
  },
});

export const test = mutation({
  args: { id: v.id("webhooks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const webhook = await ctx.db.get(args.id);
    if (!webhook || webhook.userId !== userId) {
      throw new Error("Webhook not found");
    }
    // Update lastTriggeredAt to simulate a test
    await ctx.db.patch(args.id, { lastTriggeredAt: Date.now() });
    return { success: true };
  },
});
