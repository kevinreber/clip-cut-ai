import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("folders")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("folders", {
      userId,
      name: args.name,
      color: args.color,
      createdAt: Date.now(),
    });
  },
});

export const rename = mutation({
  args: {
    id: v.id("folders"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const folder = await ctx.db.get(args.id);
    if (!folder || folder.userId !== userId) {
      throw new Error("Folder not found");
    }
    await ctx.db.patch(args.id, { name: args.name });
  },
});

export const updateColor = mutation({
  args: {
    id: v.id("folders"),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const folder = await ctx.db.get(args.id);
    if (!folder || folder.userId !== userId) {
      throw new Error("Folder not found");
    }
    await ctx.db.patch(args.id, { color: args.color });
  },
});

export const deleteFolder = mutation({
  args: { id: v.id("folders") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const folder = await ctx.db.get(args.id);
    if (!folder || folder.userId !== userId) {
      throw new Error("Folder not found");
    }
    // Unset folderId on all projects in this folder
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_folderId", (q) => q.eq("folderId", args.id))
      .collect();
    for (const project of projects) {
      await ctx.db.patch(project._id, { folderId: undefined });
    }
    await ctx.db.delete(args.id);
  },
});
