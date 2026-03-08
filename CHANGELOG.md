# Changelog

All notable changes to ClipCut AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added
- Features roadmap document with 20 planned features across 3 tiers
- Changelog page (`/changelog`) for users to see what's new

---

## [1.0.0] - 2026-03-08

### Added
- AI-powered video upload and transcription via OpenAI Whisper
- Automatic detection of filler words (um, uh, like, you know, etc.)
- Automatic detection of long silences (2s+) and word repetitions
- Interactive transcript editor with click-to-delete and range selection
- One-click cleanup to auto-remove all flagged fillers/silences/repetitions
- Real-time preview mode that skips deleted segments during playback
- Undo/redo history (up to 100 states)
- Video export with quality presets (Original, Fast, Balanced, High Quality)
- Audio-only export (MP3)
- Subtitle export in SRT, VTT, and plain text formats
- Playback speed control (0.5x - 4x) and volume slider
- Timeline visualization with word-density waveform
- Before/after comparison view
- Project dashboard with search, sorting, pagination, and batch delete
- Project duplication and renaming
- Custom filler word dictionary per project
- Multi-language transcription support (90+ languages)
- Password and Google OAuth authentication
- User-provided OpenAI API key support (Settings page)
- Dark/Light theme toggle with persistent preference
- Local video caching via IndexedDB
- Public demo mode and free trial mode (no account required)
- Keyboard shortcuts (press `?` to view)
- Unsaved changes warning
- Client-side video processing via FFmpeg WASM (privacy-first)
