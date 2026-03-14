# Plan: Project Folders & Tags

## Overview
Add project organization via flat folders and free-form tags. Projects can belong to one folder (or none) and have multiple tags. All filtering stays client-side to match existing patterns.

---

## Step 1: Schema Changes (`convex/schema.ts`)
- Add `folders` table: `{ userId: string, name: string, color?: string, createdAt: number }` with index `by_userId`
- Add fields to `projects` table:
  - `folderId?: Id<"folders">` — optional folder reference
  - `tags?: string[]` — array of tag strings
- Add index `by_folderId` on projects table

## Step 2: Backend — Folder CRUD (`convex/folders.ts`, new file)
- `list` query — list folders for authenticated user
- `create` mutation — create a folder (name, optional color)
- `rename` mutation — rename a folder
- `updateColor` mutation — change folder color
- `deleteFolder` mutation — delete folder and unset `folderId` on all contained projects

## Step 3: Backend — Project Tag & Folder Mutations (`convex/projects.ts`)
- `moveToFolder` mutation — set/unset `folderId` on a project
- `moveMultipleToFolder` mutation — batch move (extends existing multi-select pattern)
- `updateTags` mutation — set tags array on a project
- `addTag` mutation — add a single tag to a project
- `removeTag` mutation — remove a single tag from a project

## Step 4: Dashboard UI — Folder Sidebar (`app/routes/index.tsx`)
- Add a collapsible folder sidebar/panel on the left side of the project grid
- Show "All Projects" (default), then list of user folders with color dots
- Clicking a folder filters the project list to that folder
- "+" button to create a new folder (inline input)
- Right-click or "..." menu on folders: rename, change color, delete
- Add `activeFolder` state (null = all projects, or folder ID)

## Step 5: Dashboard UI — Tags on Project Cards
- Display tag badges (small pills) on each project card
- Add a tag input/autocomplete when editing tags (click "+" on card or via context menu)
- Autocomplete suggests existing tags from user's projects
- Tags are clickable to filter by that tag

## Step 6: Dashboard UI — Filter Bar Enhancements
- Add tag filter dropdown next to existing search and sort controls
- Multi-select tag filter (show projects matching ANY selected tag)
- Show active filters with dismiss chips
- Update the `useMemo` filtering logic to include folder and tag filters

## Step 7: Batch Operations
- Extend existing multi-select to support "Move to folder" and "Add tag" batch actions
- Add buttons to the selection toolbar

## Step 8: E2E Tests (`e2e/project-organization.spec.ts`)
- Test folder CRUD (create, rename, delete)
- Test moving projects to folders
- Test tag add/remove on projects
- Test filtering by folder and tag
- Test batch move to folder

## Step 9: Changelog
- Update `CHANGELOG.md` with the new feature under `## [Unreleased]` → `### Added`

---

## Design Decisions
- **Flat folders** (no nesting) — keeps UX simple, avoids tree traversal complexity
- **Free-form tags** — no predefined tag list; autocomplete from existing tags
- **Client-side filtering** — matches existing pattern (all projects loaded via `useQuery`)
- **Folder colors** — small set of preset colors for visual distinction
- **One folder per project** — simpler mental model (use tags for cross-cutting concerns)
