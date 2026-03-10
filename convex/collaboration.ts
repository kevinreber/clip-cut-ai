import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Collaborator Management ──

export const shareProject = mutation({
  args: {
    projectId: v.id("projects"),
    email: v.string(),
    role: v.union(v.literal("editor"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Only the project owner can share");
    }

    // Find user by email
    const existingUsers = await ctx.db.query("users").collect();
    const targetUser = existingUsers.find(
      (u: any) => (u.email ?? u.name) === args.email
    );

    // Check for existing collaborator
    const existing = await ctx.db
      .query("projectCollaborators")
      .withIndex("by_project_user", (q) =>
        q.eq("projectId", args.projectId).eq("userId", targetUser?._id ?? "")
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { role: args.role });
      return existing._id;
    }

    return await ctx.db.insert("projectCollaborators", {
      projectId: args.projectId,
      userId: targetUser?._id ?? "",
      email: args.email,
      role: args.role,
      invitedBy: userId,
      createdAt: Date.now(),
    });
  },
});

export const removeCollaborator = mutation({
  args: {
    collaboratorId: v.id("projectCollaborators"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const collab = await ctx.db.get(args.collaboratorId);
    if (!collab) throw new Error("Collaborator not found");

    const project = await ctx.db.get(collab.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Only the project owner can remove collaborators");
    }

    await ctx.db.delete(args.collaboratorId);
  },
});

export const listCollaborators = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("projectCollaborators")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const listSharedWithMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const collabs = await ctx.db
      .query("projectCollaborators")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const projects = await Promise.all(
      collabs.map(async (c) => {
        const project = await ctx.db.get(c.projectId);
        return project ? { ...project, collaboratorRole: c.role } : null;
      })
    );

    return projects.filter(Boolean);
  },
});

// ── Presence ──

const PRESENCE_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

export const updatePresence = mutation({
  args: {
    projectId: v.id("projects"),
    cursorWordIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    const userName = (user as any)?.email ?? (user as any)?.name ?? "User";

    const existing = await ctx.db
      .query("projectPresence")
      .withIndex("by_project_user", (q) =>
        q.eq("projectId", args.projectId).eq("userId", userId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        cursorWordIndex: args.cursorWordIndex,
        lastSeenAt: Date.now(),
      });
      return existing._id;
    }

    // Assign a color based on existing presence count
    const allPresence = await ctx.db
      .query("projectPresence")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();
    const color = PRESENCE_COLORS[allPresence.length % PRESENCE_COLORS.length];

    return await ctx.db.insert("projectPresence", {
      projectId: args.projectId,
      userId,
      userName,
      color,
      cursorWordIndex: args.cursorWordIndex,
      lastSeenAt: Date.now(),
    });
  },
});

export const removePresence = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const existing = await ctx.db
      .query("projectPresence")
      .withIndex("by_project_user", (q) =>
        q.eq("projectId", args.projectId).eq("userId", userId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const getPresence = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const cutoff = Date.now() - 30_000; // 30 second timeout
    const allPresence = await ctx.db
      .query("projectPresence")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Filter out stale entries and current user
    return allPresence.filter(
      (p) => p.lastSeenAt > cutoff && p.userId !== userId
    );
  },
});

// ── Comments ──

export const addComment = mutation({
  args: {
    projectId: v.id("projects"),
    wordIndex: v.optional(v.number()),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    const userName = (user as any)?.email ?? (user as any)?.name ?? "User";

    return await ctx.db.insert("projectComments", {
      projectId: args.projectId,
      userId,
      userName,
      wordIndex: args.wordIndex,
      text: args.text,
      resolved: false,
      createdAt: Date.now(),
    });
  },
});

export const resolveComment = mutation({
  args: { commentId: v.id("projectComments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    const resolverName = (user as any)?.email ?? (user as any)?.name ?? "User";

    await ctx.db.patch(args.commentId, {
      resolved: true,
      resolvedBy: resolverName,
    });
  },
});

export const deleteComment = mutation({
  args: { commentId: v.id("projectComments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const comment = await ctx.db.get(args.commentId);
    if (!comment || comment.userId !== userId) {
      throw new Error("Can only delete your own comments");
    }

    await ctx.db.delete(args.commentId);
  },
});

export const listComments = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("projectComments")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

// ── Access Helpers ──

export const canAccessProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { access: false as const };

    const project = await ctx.db.get(args.projectId);
    if (!project) return { access: false as const };

    // Owner has full access
    if (project.userId === userId) {
      return { access: true as const, role: "owner" as const };
    }

    // Check collaborator access
    const collab = await ctx.db
      .query("projectCollaborators")
      .withIndex("by_project_user", (q) =>
        q.eq("projectId", args.projectId).eq("userId", userId)
      )
      .first();

    if (collab) {
      return { access: true as const, role: collab.role };
    }

    return { access: false as const };
  },
});
