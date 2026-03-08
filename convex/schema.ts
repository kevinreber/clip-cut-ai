import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  userApiKeys: defineTable({
    userId: v.string(),
    openaiApiKey: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),
  projects: defineTable({
    name: v.string(),
    userId: v.string(),
    videoFileId: v.optional(v.id("_storage")),
    transcript: v.optional(
      v.array(
        v.object({
          word: v.string(),
          start: v.number(),
          end: v.number(),
          isFiller: v.boolean(),
          isDeleted: v.boolean(),
          confidence: v.optional(v.number()),
        })
      )
    ),
    status: v.union(
      v.literal("uploading"),
      v.literal("analyzing"),
      v.literal("ready")
    ),
    language: v.optional(v.string()),
    customFillerWords: v.optional(v.array(v.string())),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),
  exportPresets: defineTable({
    userId: v.string(),
    name: v.string(),
    quality: v.string(),
    format: v.string(),
  }).index("by_userId", ["userId"]),
});
