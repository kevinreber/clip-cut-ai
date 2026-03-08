# Project Spec: ClipCut (AI Video Editor)

ClipCut is a web-based video editor designed to automate the removal of filler words (ums, uhs), long silences, and redundant repetitions using AI transcription and client-side video processing.

## 🏗️ Technical Stack

* **Frontend:** TanStack Start (Router + Query) for a type-safe, SPA-first experience.
* **Backend/Database:** Convex (Reactive database, File storage, and background Actions).
* **AI Engine:** OpenAI Whisper (via Convex Actions or Replicate) for timestamped transcription.
* **Video Processing:** `ffmpeg.wasm` for client-side trimming and exporting.
* **Hosting:** Vercel (Frontend/API).

## 📋 Core Requirements

* **Cross-Platform:** Must work on Desktop and Mobile browsers (responsive UI).
* **Project Persistence:** Users can save/load projects (Video + Edit Decision List) via Convex.
* **AI Analysis:** Automated detection of "ums", "uhs", silences (>2s), and repetitions.
* **Transcript Editing:** Deleting text in the transcript automatically cuts the video at those timestamps.
* **Local Export:** Render the final video on the user's device (WASM) to ensure privacy and eliminate server rendering costs.

## 🛠️ Data Model (Convex Schema)

```typescript
// Proposed Schema
projects: {
  name: string,
  userId: string,
  videoFileId: string (Convex Storage ID),
  transcript: Array<{
    word: string,
    start: number,
    end: number,
    isFiller: boolean,
    isDeleted: boolean
  }>,
  status: "uploading" | "analyzing" | "ready",
  createdAt: number
}
```

## ⚠️ Known Trade-offs & Mitigation Strategies

| Feature | Trade-off | Mitigation Strategy |
| :--- | :--- | :--- |
| **WASM Performance** | Client-side export is 5-10x slower than native apps. | Use `WorkerFS` to prevent memory crashes and show a detailed progress bar. |
| **Mobile Memory** | Large 4K files may crash mobile browser tabs during render. | Extract audio locally in the browser; suggest 1080p resolution for mobile exports. |
| **Convex Bandwidth** | Large video uploads/downloads incur high data costs. | Extract and send *only* audio to Convex/Whisper for analysis; keep video local for previewing. |
| **Real-time vs. Durable** | Convex Actions aren't "durable" (restarts if interrupted). | If video files exceed 20-30 mins, consider migrating the workflow to **Temporal**. |
| **System Complexity** | No Kafka means limited event queuing. | Use Convex's native reactivity for the MVP; avoid Kafka until scaling past 10k+ concurrent users. |

## 🚀 Execution Roadmap

### Phase 1: The Reactive Foundation
- [x] Initialize **TanStack Start** + **Convex** project.
- [x] Implement Video Upload to Convex File Storage.
- [x] Create basic video player synced to a "dummy" transcript for UI testing.

### Phase 2: AI Orchestration
- [x] Create a **Convex Action** to extract audio (using FFmpeg) and send to Whisper.
- [x] Develop logic to flag "ums/uhs" and silences in the returned JSON timestamps.
- [x] Update the UI to highlight these segments automatically for user review.

### Phase 3: The Editing Engine
- [x] Implement "Delete word" functionality (updates `isDeleted` in Convex).
- [x] Build the timeline "Cut" logic using the transcript timestamps.
- [x] Integrate `ffmpeg.wasm` to stitch segments together based on the `isDeleted` flags in the browser.

### Phase 4: Optimization & Polish
- [x] Add **Local-First caching** for video files to reduce repeated downloads.
- [x] Implement multi-device project syncing via **Convex Auth**.
- [x] Finalize "One-Click Clean" feature to auto-delete all flagged fillers.

### Phase 5: Advanced Features & UX
- [x] **Toast notifications** - Replace browser alerts with elegant toast system.
- [x] **Drag-and-drop upload** - Drop video files directly into the upload area.
- [x] **Playback controls** - Volume slider, mute toggle, and playback speed (0.5x-4x).
- [x] **Keyboard shortcut help panel** - Press `?` to view all shortcuts.
- [x] **Export quality settings** - Choose between Fast, Balanced, and High Quality presets.
- [x] **Batch operations** - Quick actions to remove all fillers, silences, or repetitions at once.
- [x] **Waveform visualization** - Word-density waveform on the timeline for visual reference.
- [x] **Undo history cap** - Limit to 100 states to prevent memory issues.
- [x] **Unsaved changes warning** - Browser prompt before navigating away with edits.
- [x] **Project pagination** - Paginated project grid with 12 per page.
- [x] **Dark/Light theme toggle** - Persistent theme preference with smooth transitions.
- [x] **Inline delete confirmation** - Replace browser confirm dialogs with inline UI.

### Phase 6: Testing
- [x] **Playwright e2e setup** - Config with Chromium, Firefox, and mobile Chrome projects.
- [x] **Auth flow tests** - Sign up, sign in, sign out, error handling, protected routes.
- [x] **Dashboard tests** - Upload area, search/filter, sort, pagination, inline delete confirmation.
- [x] **Editor tests** - Navigation, playback controls, keyboard shortcuts modal, transcript panel, rename.
- [x] **Theme & export tests** - Theme toggle persistence, export quality UI, subtitle export buttons.

---

## 💡 Feature Brainstorm (Future Phases)

A running list of potential new features, organized by category. Items are unchecked and unprioritized — this is a living brainstorm doc.

### AI & Transcription Enhancements
- [ ] **Multi-language transcription** — Whisper supports 90+ languages; let users select a language or auto-detect it before analysis.
- [ ] **Speaker diarization** — Identify and label different speakers in the transcript (e.g., "Speaker A", "Speaker B") with per-speaker color coding.
- [ ] **AI smart cuts** — Go beyond fillers: detect and flag mumbled/low-confidence segments, false starts, and off-topic tangents using an LLM pass over the transcript.
- [ ] **AI video summary** — Generate a short text summary or bullet-point outline of the video's content using an LLM.
- [ ] **Custom filler word dictionary** — Let users add their own filler words/phrases (e.g., "basically", "right", "sort of") to the detection list per project or globally.
- [x] **Adjustable silence threshold** — Let users configure the minimum silence duration (currently hardcoded at 2s) via a slider (0.5s–5s).
- [ ] **Confidence scores** — Show Whisper's per-word confidence and let users filter/flag low-confidence words for review.
- [ ] **AI-powered chapter markers** — Auto-detect topic changes and generate chapter markers with titles, useful for YouTube uploads.

### Editing & Timeline
- [ ] **Manual trim handles** — Drag-to-trim start/end points on individual segments in the timeline, beyond word-level granularity.
- [x] **Transcript search & replace** — Find specific words/phrases in the transcript and bulk-select or replace them.
- [ ] **Split & merge segments** — Manually split a word segment or merge adjacent segments for fine-grained control.
- [ ] **Clip extraction** — Select a range of the transcript and export just that portion as a standalone clip.
- [ ] **Multi-track timeline** — Visual timeline with separate audio and video tracks for more advanced editing.
- [ ] **Markers & annotations** — Let users drop custom markers on the timeline with notes (e.g., "re-record this section").
- [x] **Keyboard shortcuts expansion** — Add shortcuts for common actions: J/K/L for rewind/pause/forward, arrow keys for word-by-word navigation, number keys for playback speed.

### Export & Output
- [ ] **Audio-only export** — Export just the cleaned audio as MP3/WAV, perfect for podcast workflows.
- [ ] **Burn-in subtitles** — Render captions directly onto the video with customizable font, size, position, and style.
- [ ] **Custom resolution & format** — Let users choose output resolution (1080p, 720p, 480p) and container format (MP4, WebM).
- [ ] **Direct social media upload** — One-click export to YouTube, TikTok, Instagram Reels, or Vimeo via their APIs.
- [ ] **Animated captions export** — Generate trendy word-by-word animated captions (TikTok/Reels style) overlaid on the video.
- [ ] **GIF/short clip export** — Export a selected segment as an animated GIF or short-form clip.
- [ ] **Intro/outro templates** — Append a branded intro or outro card to the exported video.

### Collaboration & Sharing
- [ ] **Shared projects** — Invite collaborators by email to view or edit a project together.
- [ ] **Commenting system** — Leave timestamped comments on the transcript for async review (e.g., "keep this part").
- [ ] **Share preview link** — Generate a public or password-protected link to share the edited video preview (no download).
- [ ] **Team workspaces** — Organization-level accounts with shared project libraries and member roles.

### UX & Quality of Life
- [x] **Auto-save** — Add periodic background saves (every 30s) with a visual save indicator.
- [ ] **Version history** — Browse and restore previous edit states of a project, beyond the in-session undo/redo stack.
- [ ] **Project folders/tags** — Organize projects into folders or apply tags for better library management.
- [ ] **Batch processing** — Upload multiple videos and apply a "clean all fillers + silences" preset to all of them in one go.
- [ ] **Video thumbnails** — Auto-generate thumbnail previews for each project on the dashboard (extract a frame at 25%).
- [ ] **Drag-to-reorder segments** — Reorder kept segments in the timeline to rearrange the video's narrative flow.
- [ ] **Side-by-side before/after** — Preview the original vs. edited video simultaneously for comparison.
- [ ] **Analytics dashboard** — Show stats across all projects: total filler words removed, total time saved, most common fillers, etc.
- [ ] **Onboarding tour** — First-time user walkthrough highlighting key features (transcript panel, timeline, export).

### Audio & Video Processing
- [ ] **Audio normalization** — Auto-level audio volume across the video to fix quiet/loud segments.
- [ ] **Noise reduction** — AI-powered background noise removal (fan hum, keyboard clicks, echo).
- [ ] **Audio ducking** — Automatically lower background music volume when speech is detected.
- [x] **Fade transitions** — Add configurable crossfade (audio) and fade-to-black (video) between cuts instead of hard jumps.
- [ ] **Playback speed ramp** — Speed up silence/filler sections instead of cutting them entirely (e.g., 3x speed through pauses).

### Integrations & Platform
- [ ] **Zoom/Teams/Meet import** — Import cloud recordings directly from meeting platforms via OAuth.
- [ ] **Google Drive / Dropbox import** — Pull videos from cloud storage without downloading locally first.
- [ ] **PWA (Progressive Web App)** — Installable app experience with offline support for previously cached projects.
- [ ] **Browser extension** — Clip and edit videos from the web (e.g., right-click a video → "Edit in ClipCut").
- [ ] **REST API** — Public API for programmatic video analysis and export, enabling third-party integrations.
- [ ] **Webhook notifications** — Notify external services (Slack, Discord, email) when a video analysis completes.

---
*Project: ClipCut AI | 2026*
