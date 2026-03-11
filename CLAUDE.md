# CLAUDE.md — Project Instructions for Claude Code

## Project Overview

ClipCut AI is an AI-powered web-based video editor that removes filler words, silences, and repetitions from videos. Built with React 19 + TanStack Start, Convex backend, and client-side FFmpeg WASM processing. Video never leaves the browser — all rendering happens via FFmpeg WASM for privacy.

## Key Commands

```bash
npm run dev              # Start Convex dev + Vite dev server (concurrent)
npm run build            # Production build (Vite only)
npm start                # Preview built app
npm run lint             # Run ESLint
npm run test:e2e         # Run Playwright E2E tests (all browsers)
npm run test:e2e:ui      # Interactive Playwright UI
npm run test:e2e:headed  # Headed browser mode
npm run test:e2e:chromium # Chromium only
```

## Changelog Requirement

**IMPORTANT: Every PR and commit that adds, changes, or fixes user-facing functionality MUST include an update to `CHANGELOG.md`.**

- Follow the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format
- Add entries under `## [Unreleased]` at the top
- Use the appropriate section heading: `### Added`, `### Changed`, `### Fixed`, `### Removed`, `### Deprecated`, `### Security`
- Each entry should be a single line starting with `- ` describing the change from a user's perspective
- The `/changelog` page renders this file directly — keep entries clear and user-friendly
- A pre-push hook (`enforce-changelog.sh`) blocks pushes without CHANGELOG.md updates

## Project Structure

```
app/
├── routes/               # TanStack file-based routes (auto-generates routeTree.gen.ts)
│   ├── __root.tsx        # Root layout — providers, auth, theme, toasts
│   ├── index.tsx         # Dashboard (project list, search, upload)
│   ├── project.$id.tsx   # Main editor page (~1800 lines)
│   ├── settings.tsx      # User settings (API keys)
│   ├── demo.tsx          # Public demo (no auth required)
│   ├── try.tsx           # Free trial mode (no auth required)
│   ├── record.tsx        # Screen recording
│   ├── compilations.tsx  # Multi-video compilation
│   └── changelog.tsx     # Renders CHANGELOG.md
├── components/           # 34 React components
├── lib/                  # Utilities and hooks
│   ├── video-export.ts   # FFmpeg WASM video export
│   ├── subtitle-export.ts # SRT/VTT/ASS subtitle generation
│   ├── use-video-player.ts # Video playback hook
│   ├── use-video-cache.ts  # IndexedDB video caching
│   └── use-undo-redo.ts    # Undo/redo state (100 states max)
├── convex.tsx            # Convex provider setup
├── router.tsx            # TanStack Router config
├── client.tsx            # Client hydration entry
├── ssr.tsx               # SSR handler
└── styles.css            # Global Tailwind + custom animations

convex/                   # Backend (79 exported functions)
├── schema.ts             # Database schema (10 tables)
├── projects.ts           # Project CRUD queries/mutations
├── analyze.ts            # Whisper transcription + filler detection
├── analyzeHelpers.ts     # Shared analysis utilities
├── aiFeatures.ts         # GPT-4o-mini features (summary, chapters, clips, etc.)
├── aiFeatureHelpers.ts   # AI helper functions
├── compilations.ts       # Multi-video composition
├── compileAi.ts          # AI-driven compilation logic
├── collaboration.ts      # Real-time collab, comments, presence
├── auth.ts               # Convex Auth configuration
├── auth.config.ts        # Auth provider config (Google OAuth + password)
├── users.ts              # User queries
├── userApiKeys.ts        # OpenAI API key management (BYOK)
├── webhooks.ts           # Event-driven HTTP callbacks
├── cleanupPresets.ts     # Cleanup preset CRUD
├── http.ts               # HTTP router
└── _generated/           # Auto-generated Convex types (do not edit)

e2e/                      # Playwright E2E tests
├── helpers.ts            # Shared test utilities
├── auth.spec.ts          # Login/signup flows
├── dashboard.spec.ts     # Project list & search
├── editor.spec.ts        # Transcript editing
├── theme-and-export.spec.ts
├── p1-features.spec.ts
├── p1-new-features.spec.ts
├── p2-features.spec.ts
├── p2-new-features.spec.ts
├── tier3-features.spec.ts
├── story-assembly.spec.ts
├── collaborative-editing.spec.ts
├── screen-recording.spec.ts
└── enhancements.spec.ts

scripts/
└── vercel-build.sh       # Vercel Build Output API setup

.claude/
├── settings.json         # Claude Code hooks config
└── hooks/
    ├── enforce-changelog.sh        # Blocks pushes without CHANGELOG.md
    ├── merge-main-before-push.sh   # Auto-merges main before push
    └── run-e2e-tests-before-push.sh # Runs E2E tests on feature branches
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 19 |
| Meta-framework | TanStack Start 1.166 (Router + SSR) |
| Backend | Convex (real-time DB, file storage, auth, background actions) |
| Auth | @convex-dev/auth (Google OAuth + email/password) |
| Transcription | OpenAI Whisper API |
| AI Features | GPT-4o-mini (summaries, chapters, rewrites, clip scoring) |
| TTS | OpenAI TTS API (6 voices) |
| Video Processing | FFmpeg WASM (client-side, privacy-first) |
| Styling | Tailwind CSS 4 (via Vite plugin) |
| Bundler | Vite 7 |
| Testing | Playwright 1.58 (Chromium, Firefox, Mobile Chrome) |
| Deployment | Vercel (Node.js 22.x serverless) + Convex |
| Language | TypeScript 5.7 (strict mode) |

## Database Schema (Convex)

Key tables in `convex/schema.ts`:

- **projects** — Video projects with transcript data, filler words, status. Indexed by `userId`.
- **compilations** — Multi-video assembly projects (modes: best-story, highlight-reel, chronological, custom).
- **projectCollaborators** — Sharing & role-based permissions (editor/viewer). Indexed by `projectId`, `userId`.
- **projectComments** — Threaded comments anchored to transcript word indexes.
- **projectPresence** — Real-time "who's online" cursor tracking.
- **exportPresets** — Saved export quality/format configurations.
- **cleanupPresets** — Reusable cleanup profiles (silence threshold, filler words, confidence).
- **webhooks** — Event notification URLs (export complete, analysis done, project created).
- **userApiKeys** — User-provided OpenAI API keys (BYOK model).
- **users** — Managed by @convex-dev/auth.

## Environment Variables

Defined in `.env.example`. Most are set in the **Convex dashboard** (Settings > Environment Variables):

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_CONVEX_URL` | `.env` | Convex deployment URL (used by Vite) |
| `JWT_PRIVATE_KEY` | Convex dashboard | Session JWT signing (generate via `npx @convex-dev/auth`) |
| `SITE_URL` | Convex dashboard | Frontend URL for OAuth redirects |
| `AUTH_GOOGLE_ID` | Convex dashboard | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Convex dashboard | Google OAuth client secret |
| `OPENAI_API_KEY` | Convex dashboard | Server-side Whisper/GPT/TTS API calls |

## Code Conventions

### Frontend

- **File-based routing**: New pages go in `app/routes/`. Route tree auto-regenerates.
- **Convex React hooks**: Use `useQuery()`, `useMutation()`, `useAction()` for all data operations.
- **No separate CSS files**: Use Tailwind utility classes inline. Custom CSS goes in `app/styles.css` only for animations/themes.
- **Theme system**: Light/dark mode via CSS custom properties (`--color-primary`, `--color-surface`, etc.).
- **Component naming**: Descriptive PascalCase (e.g., `MultiTrackTimeline`, `AIRewriteSuggestions`).
- **Custom hooks**: Prefix with `use-` in `app/lib/` (e.g., `use-video-player.ts`).

### Backend (Convex)

- **Queries**: Read-only database operations (`query()` from Convex).
- **Mutations**: Write operations (`mutation()` from Convex).
- **Actions**: Long-running async work — API calls to Whisper, GPT, TTS (`action()` from Convex).
- **Auth**: Always verify user with `getAuthUserId(ctx)` at the start of authenticated functions.
- **Errors**: Use `ConvexError` for user-facing error messages.
- **Indexes**: Use `.withIndex()` for all filtered queries (never scan full tables).
- **Never edit `convex/_generated/`**: These files are auto-generated by Convex.

### TypeScript

- Strict mode enabled — avoid `any` types.
- ES modules (`"type": "module"` in package.json).

### Testing

- E2E tests live in `e2e/` directory.
- Tests run against `http://localhost:3000` (auto-started by Playwright).
- Multi-browser: Chromium, Firefox, Mobile Chrome.
- New user-facing features should have corresponding E2E tests.
- Reporter: HTML locally, GitHub reporter in CI.

## Pre-Push Hooks

Three hooks run automatically via `.claude/settings.json`:

1. **enforce-changelog.sh** — Blocks `git commit` if `CHANGELOG.md` is not staged (for user-facing changes).
2. **merge-main-before-push.sh** — Auto-merges `origin/main` before push to prevent stale-branch conflicts.
3. **run-e2e-tests-before-push.sh** — Runs `npm run test:e2e` on non-main branches; gracefully skips if Playwright is not installed.

## Deployment

- **Frontend**: Vercel via `scripts/vercel-build.sh` using Build Output API v3.
  - Static assets → `.vercel/output/static/`
  - SSR → Node.js 22.x serverless function in `.vercel/output/functions/`
  - Required headers: `Cross-Origin-Embedder-Policy: credentialless`, `Cross-Origin-Opener-Policy: same-origin` (for FFmpeg WASM SharedArrayBuffer).
- **Backend**: Convex auto-deploys on `vercel-build` or manually with `npx convex deploy`.

## Key Architecture Decisions

- **Client-side video processing**: FFmpeg WASM runs in the browser. Video data never leaves the user's machine — only transcript text is sent to the server.
- **BYOK (Bring Your Own Key)**: Users can provide their own OpenAI API key in Settings, or use the shared platform budget.
- **Real-time sync**: Convex reactive queries power live updates for collaboration, presence, and data changes.
- **Public pages**: `/demo` and `/try` work without authentication for user acquisition.
- **PWA support**: `public/manifest.json` with app icons for all platforms.
