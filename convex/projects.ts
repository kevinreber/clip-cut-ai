import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const project = await ctx.db.get(args.id);
    if (!project) return null;
    // Allow owner access
    if (project.userId === userId) return project;
    // Allow collaborator access
    const collab = await ctx.db
      .query("projectCollaborators")
      .withIndex("by_project_user", (q) =>
        q.eq("projectId", args.id).eq("userId", userId)
      )
      .first();
    if (collab) return project;
    return null;
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("projects", {
      name: args.name,
      userId,
      status: "uploading",
      createdAt: Date.now(),
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachVideo = mutation({
  args: {
    projectId: v.id("projects"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found");
    }
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
        confidence: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found");
    }
    await ctx.db.patch(args.projectId, {
      transcript: args.transcript,
    });
  },
});

export const renameProject = mutation({
  args: {
    id: v.id("projects"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found");
    }
    await ctx.db.patch(args.id, { name: args.name });
  },
});

export const deleteProject = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found");
    }
    if (project.videoFileId) {
      await ctx.storage.delete(project.videoFileId);
    }
    await ctx.db.delete(args.id);
  },
});

export const deleteMultipleProjects = mutation({
  args: { ids: v.array(v.id("projects")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    for (const id of args.ids) {
      const project = await ctx.db.get(id);
      if (!project || project.userId !== userId) continue;
      if (project.videoFileId) {
        await ctx.storage.delete(project.videoFileId);
      }
      await ctx.db.delete(id);
    }
  },
});

export const duplicateProject = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found");
    }
    return await ctx.db.insert("projects", {
      name: `${project.name} (copy)`,
      userId,
      videoFileId: project.videoFileId,
      transcript: project.transcript,
      status: project.status === "analyzing" ? "ready" : project.status,
      language: project.language,
      customFillerWords: project.customFillerWords,
      silenceThreshold: project.silenceThreshold,
      createdAt: Date.now(),
    });
  },
});

export const updateLanguage = mutation({
  args: {
    projectId: v.id("projects"),
    language: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found");
    }
    await ctx.db.patch(args.projectId, { language: args.language });
  },
});

export const updateSilenceThreshold = mutation({
  args: {
    projectId: v.id("projects"),
    silenceThreshold: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found");
    }
    await ctx.db.patch(args.projectId, {
      silenceThreshold: args.silenceThreshold,
    });
  },
});

export const updateCustomFillerWords = mutation({
  args: {
    projectId: v.id("projects"),
    customFillerWords: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found");
    }
    await ctx.db.patch(args.projectId, {
      customFillerWords: args.customFillerWords,
    });
  },
});

// Export presets
export const listExportPresets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("exportPresets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const saveExportPreset = mutation({
  args: {
    name: v.string(),
    quality: v.string(),
    format: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("exportPresets", {
      userId,
      name: args.name,
      quality: args.quality,
      format: args.format,
    });
  },
});

export const deleteExportPreset = mutation({
  args: { id: v.id("exportPresets") },
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

export const updateCaptionStyle = mutation({
  args: {
    projectId: v.id("projects"),
    captionStyle: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(args.projectId, {
      captionStyle: args.captionStyle,
    });
  },
});

export const updateTracks = mutation({
  args: {
    projectId: v.id("projects"),
    tracks: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        type: v.union(
          v.literal("video"),
          v.literal("audio"),
          v.literal("image"),
          v.literal("text")
        ),
        fileId: v.optional(v.id("_storage")),
        start: v.number(),
        end: v.number(),
        layer: v.number(),
        volume: v.optional(v.number()),
        opacity: v.optional(v.number()),
        text: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(args.projectId, { tracks: args.tracks });
  },
});

export const updateTtsSegments = mutation({
  args: {
    projectId: v.id("projects"),
    ttsSegments: v.array(
      v.object({
        id: v.string(),
        text: v.string(),
        start: v.number(),
        end: v.number(),
        voice: v.string(),
        status: v.union(
          v.literal("pending"),
          v.literal("generating"),
          v.literal("ready"),
          v.literal("error")
        ),
        audioFileId: v.optional(v.id("_storage")),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(args.projectId, { ttsSegments: args.ttsSegments });
  },
});

export const updateZoomRegions = mutation({
  args: {
    projectId: v.id("projects"),
    zoomRegions: v.array(
      v.object({
        id: v.string(),
        start: v.number(),
        end: v.number(),
        type: v.union(
          v.literal("zoom-in"),
          v.literal("zoom-out"),
          v.literal("pan"),
          v.literal("ken-burns")
        ),
        fromX: v.number(),
        fromY: v.number(),
        fromScale: v.number(),
        toX: v.number(),
        toY: v.number(),
        toScale: v.number(),
        aspectRatio: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(args.projectId, { zoomRegions: args.zoomRegions });
  },
});
