import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("projects").order("desc").collect();
  },
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projects", {
      name: args.name,
      userId: "anonymous",
      status: "uploading",
      createdAt: Date.now(),
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachVideo = mutation({
  args: {
    projectId: v.id("projects"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      videoFileId: args.storageId,
      status: "ready",
    });
  },
});

export const getVideoUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const updateTranscript = mutation({
  args: {
    projectId: v.id("projects"),
    transcript: v.array(
      v.object({
        word: v.string(),
        start: v.number(),
        end: v.number(),
        isFiller: v.boolean(),
        isDeleted: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      transcript: args.transcript,
    });
  },
});

export const deleteProject = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (project?.videoFileId) {
      await ctx.storage.delete(project.videoFileId);
    }
    await ctx.db.delete(args.id);
  },
});
