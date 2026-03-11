# Changelog

All notable changes to ClipCut AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added
- AI Story Assembly / Auto-Combine Clips — select multiple analyzed projects from the `/compilations` page, choose an assembly mode (Best Story, Highlight Reel, Chronological, Custom), and let AI analyze all transcripts to suggest an optimal narrative order with segment-level reasoning; drag-to-reorder segments, toggle include/exclude per segment, choose transition type (Hard Cut, Crossfade, Fade to Black), and view a color-coded visual timeline of the assembled compilation; "Combine Videos" button added to dashboard
- E2E test suite for AI Story Assembly feature (route validation, component rendering, error-free loading)
- Multi-Track Timeline — add B-roll video, audio, image, and text overlay tracks on top of your primary video with drag-and-drop positioning, per-track volume/opacity controls, and layer management
- Text-to-Speech Gap Filler — when you delete sections from your transcript, AI suggests natural bridging phrases and generates voice audio (via OpenAI TTS) to smoothly connect the remaining content; choose from 6 voices (Alloy, Echo, Fable, Onyx, Nova, Shimmer)
- AI Zoom / Reframe — automatically detect the best moments for dynamic zoom, pan, and Ken Burns effects; convert landscape video to portrait (9:16) for TikTok/Reels/Shorts with live canvas preview; supports manual region editing with adjustable scale and position
- E2E test suite for Tier 3 features (multi-track timeline, TTS gap filler, AI zoom/reframe)
- Collaborative Editing — share projects with team members as editors or viewers; real-time presence indicators show who's online with colored avatars; threaded comments anchored to specific transcript words with resolve/delete support; project owner can invite collaborators by email and manage roles from the Share dialog
- E2E test suite for collaborative editing features (share dialog, comments panel, presence indicators)
- Built-In Screen Recording — record your screen, camera, or both directly in ClipCut AI using the browser's MediaRecorder API; pause/resume support, live preview, and one-click project creation from recordings (`/record` page)
- E2E test suite for built-in screen recording feature
- Intro/Outro Templates — attach branded intro/outro cards to your exports with 4 styles (Fade Text, Logo Card, Lower Third, Full Screen), customizable text, colors, duration, and live canvas preview
- Webhook / Zapier Integration — configure webhook URLs in Settings to receive HTTP POST notifications when exports complete, projects are analyzed, or new projects are created; includes test webhook, enable/disable toggle, and integration documentation for Zapier, Make, and n8n
- Templates & Presets Library — save, share, and apply cleanup presets with built-in options (Podcast Clean, Lecture Tighten, Interview Polish, YouTube Fast-Cut), user-created presets, and a community gallery; presets configure silence threshold, filler word lists, and confidence thresholds in one click
- E2E test suite for P2 new features (intro/outro templates, presets library, webhook settings)
- Audio Enhancement / Noise Reduction — client-side audio processing using Web Audio API with 3 presets (Clean Podcast, Reduce Background Noise, Normalize Volume) and advanced controls for noise gate, 3-band EQ, compression, and volume normalization
- AI Rewrite Suggestions — AI analyzes your transcript to find filler-heavy or unclear sections and suggests cleaner rephrasings that you can accept inline, marking original words as deleted
- Batch Processing — upload multiple videos at once from the dashboard with queue-based processing, progress tracking per video, and automatic transcription analysis
- E2E test suite for P2 features (audio enhancement, rewrite suggestions, batch processing)
- Speaker Diarization — AI identifies distinct speakers in your transcript with color-coded labels, word counts, and per-speaker percentage breakdowns shown in the editor
- AI Clip Extraction — automatically find the best 30-90 second clips from your video for TikTok, Reels, and Shorts, scored by viral potential with content tags
- Animated Captions — choose from 4 caption styles (Classic, Bold Pop, Karaoke, Minimal) with live preview, and export word-level SRT or styled ASS subtitle files with animation effects
- E2E test suite for speaker diarization, clip extraction, and animated captions features
- Pre-push Claude hook that runs E2E tests automatically when code files change, blocking push on failures (gracefully skips if Playwright is not installed)
- AI Summary & Show Notes — generate a concise summary, key topics, takeaways, and notable quotes from your transcript using GPT-4o-mini, with one-click copy for show notes
- Auto-Generated Chapters — AI detects topic boundaries in your transcript and creates chapter markers with timestamps, exportable in YouTube chapter format
- Text-Based Video Editing — switch between Word and Text editor modes; Text mode groups words into paragraphs that can be dragged to reorder, or deleted/restored as blocks
- Comprehensive E2E test suite for P1 features (text editor, regressions)
- Claude hook to auto-merge main before pushing, preventing stale-branch conflicts
- Favicons and app icons for all platforms (browser, iOS, Android, Windows tiles)
- Transcript Search & Replace — search for words/phrases across the transcript with prev/next navigation, bulk delete, and bulk restore of matches
- Confidence-Based Auto-Delete Threshold — adjustable confidence slider to auto-delete low-confidence words flagged by Whisper (visible when Confidence mode is on)
- Smart Silence Shortener — shorten silences to a configurable target duration (e.g., 2s to 0.5s) instead of removing them entirely, preserving natural pacing
- Search available on all editor pages (project editor, demo, and free trial)
- Keyboard shortcuts: Ctrl+F to focus search, F3/Shift+F3 to navigate between search matches
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
