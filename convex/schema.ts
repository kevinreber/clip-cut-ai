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
  apiUsage: defineTable({
    userId: v.string(),
    action: v.string(), // "whisper", "ai_feature", "tts", "compilation"
    creditsUsed: v.number(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_createdAt", ["userId", "createdAt"]),
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
    // Multi-Track Timeline tracks
    tracks: v.optional(
      v.array(
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
      )
    ),
    // TTS Gap Filler segments
    ttsSegments: v.optional(
      v.array(
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
      )
    ),
    // AI Zoom / Reframe regions
    zoomRegions: v.optional(
      v.array(
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
  projectCollaborators: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),
    email: v.string(),
    role: v.union(v.literal("editor"), v.literal("viewer")),
    invitedBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_userId", ["userId"])
    .index("by_project_user", ["projectId", "userId"]),
  projectPresence: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),
    userName: v.string(),
    color: v.string(),
    cursorWordIndex: v.optional(v.number()),
    lastSeenAt: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_project_user", ["projectId", "userId"]),
  projectComments: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),
    userName: v.string(),
    wordIndex: v.optional(v.number()),
    text: v.string(),
    resolved: v.boolean(),
    resolvedBy: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_projectId", ["projectId"]),
  compilations: defineTable({
    userId: v.string(),
    name: v.string(),
    sourceProjectIds: v.array(v.id("projects")),
    assemblyMode: v.union(
      v.literal("best-story"),
      v.literal("highlight-reel"),
      v.literal("chronological"),
      v.literal("custom")
    ),
    aiSuggestion: v.optional(
      v.object({
        narrativeSummary: v.string(),
        segments: v.array(
          v.object({
            projectId: v.id("projects"),
            projectName: v.string(),
            start: v.number(),
            end: v.number(),
            order: v.number(),
            reason: v.string(),
          })
        ),
      })
    ),
    finalSequence: v.optional(
      v.array(
        v.object({
          projectId: v.id("projects"),
          projectName: v.string(),
          start: v.number(),
          end: v.number(),
          order: v.number(),
          included: v.boolean(),
        })
      )
    ),
    transition: v.optional(
      v.union(
        v.literal("cut"),
        v.literal("crossfade"),
        v.literal("fade-to-black")
      )
    ),
    status: v.union(
      v.literal("selecting"),
      v.literal("analyzing"),
      v.literal("reviewed"),
      v.literal("exporting"),
      v.literal("done")
    ),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),
});
