# Changelog

All notable changes to ClipCut AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added
- Features roadmap document with 20 planned features across 3 tiers
- Changelog page (`/changelog`) for users to see what's new
- `CLAUDE.md` project instructions for contributors

---

## [1.5.0] - 2026-03-08

### Added
- User-provided OpenAI API key support (BYOK) — bring your own key instead of using the shared platform budget
- Settings page (`/settings`) with step-by-step OpenAI key setup guide, validation, and pricing info
- Custom filler word lists with add/remove UI per project
- Language selection for Whisper transcription (24 languages)
- Audio-only export (MP3) via FFmpeg WASM
- Export progress with ETA calculation
- Project duplication feature
- Per-video editing stats summary card
- Filler word frequency bar chart visualization
- Timeline drag-to-select for bulk word deletion
- Confidence score display from Whisper API
- Batch project actions (multi-select and delete from dashboard)
- Export presets — save and reuse quality settings
- Side-by-side before/after preview comparison
- Comprehensive Playwright e2e test suite for all features

### Fixed
- Video export quality loss — now uses stream copy and improved encoding settings
- Global `cursor:pointer` fix for all interactive buttons

---

## [1.4.0] - 2026-03-08

### Added
- Export format tooltips and descriptions for SRT, VTT, and plain text subtitle formats

### Fixed
- Missing `JWT_PRIVATE_KEY` and `OPENAI_API_KEY` in `.env.example`
- Missing `SITE_URL` env variable documentation for `@convex-dev/auth`

---

## [1.3.0] - 2026-03-08

### Added
- Google SSO login alongside existing email/password authentication

---

## [1.2.0] - 2026-03-08

### Added
- Landing page with hero section, feature highlights, animations, and SEO meta tags
- Public demo mode (`/demo`) with hardcoded sample transcript — no account required
- Public free trial mode (`/try`) with mock data generator — no account required

### Fixed
- Convex push error — moved queries/mutations out of Node.js runtime file

---

## [1.1.0] - 2026-03-07

### Added
- Toast notification system for user feedback
- Drag-and-drop video upload
- Playback speed control (0.5x - 4x) and volume slider with mute toggle
- Keyboard shortcut help modal (press `?` to view)
- Export quality presets (Original, Fast, Balanced, High Quality)
- Waveform timeline visualization (word-density based)
- Dark/Light theme toggle with persistent preference
- Undo/redo history (up to 100 states)
- Subtitle export in SRT, VTT, and plain text formats
- Range selection for bulk word deletion in transcript
- Project search, sorting (newest/oldest/name), and pagination on dashboard
- Preview mode that skips deleted segments during playback
- Repetition detection (consecutive identical words and 2-word phrases)
- Mobile-responsive UX improvements
- Project renaming
- Unsaved changes warning when leaving with edits

---

## [1.0.0] - 2026-03-07

### Added
- Project spec and architecture for ClipCut AI
- TanStack Start + Convex foundation (React 19, Vite 7, TypeScript)
- AI-powered video transcription via OpenAI Whisper with word-level timestamps
- Interactive transcript editor with click-to-delete individual words
- Automatic detection of filler words (um, uh, like, you know, so, etc.)
- Automatic detection of long silences (2s+ gaps between words)
- One-click cleanup to auto-remove all flagged fillers and silences
- Client-side video export via FFmpeg WASM (privacy-first — video never leaves the browser)
- Local video caching via IndexedDB to reduce repeat downloads
- Multi-device project syncing with Convex Auth (email/password)
- Timeline visualization with seek-by-click
- Vercel deployment with COOP/COEP headers for WASM support

### Fixed
- Vercel deployment 404 by adding SSR serverless function support
- Serverless function ESM loading error
- Invalid URL error in serverless function entry point
- Handler conversion from Node.js IncomingMessage to Web Request
- COEP header — switched from `require-corp` to `credentialless`
- Surfaced actual error messages from Convex actions to the client
