import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
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
        })
      )
    ),
    status: v.union(
      v.literal("uploading"),
      v.literal("analyzing"),
      v.literal("ready")
    ),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),
});
