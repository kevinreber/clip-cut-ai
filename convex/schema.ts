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
    silenceThreshold: v.optional(v.number()),
    summary: v.optional(v.string()),
    showNotes: v.optional(v.string()),
    chapters: v.optional(
      v.array(
        v.object({
          title: v.string(),
          start: v.number(),
          end: v.number(),
        })
      )
    ),
    speakers: v.optional(
      v.array(
        v.object({
          name: v.string(),
          color: v.string(),
          wordIndices: v.array(v.number()),
        })
      )
    ),
    clips: v.optional(
      v.array(
        v.object({
          title: v.string(),
          description: v.string(),
          start: v.number(),
          end: v.number(),
          score: v.number(),
          tags: v.array(v.string()),
        })
      )
    ),
    captionStyle: v.optional(v.string()),
    rewriteSuggestions: v.optional(
      v.array(
        v.object({
          startIndex: v.number(),
          endIndex: v.number(),
          originalText: v.string(),
          suggestedText: v.string(),
          reason: v.string(),
        })
      )
    ),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),
  exportPresets: defineTable({
    userId: v.string(),
    name: v.string(),
    quality: v.string(),
    format: v.string(),
  }).index("by_userId", ["userId"]),
  webhooks: defineTable({
    userId: v.string(),
    url: v.string(),
    events: v.array(v.string()),
    active: v.boolean(),
    secret: v.string(),
    lastTriggeredAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),
  cleanupPresets: defineTable({
    userId: v.string(),
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
    usageCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_public", ["isPublic"]),
});
