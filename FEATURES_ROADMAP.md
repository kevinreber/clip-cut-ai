# ClipCut AI — Features Roadmap

This document catalogs potential features to evolve ClipCut from an AI filler-word remover into a comprehensive AI post-production suite for content creators.

---

## Tier 1 — Natural Extensions (Core Niche)

Features that directly enhance the existing filler-removal and transcript-editing workflow.

### 1. Auto-Generated Chapters / Sections
- Use transcript + silence gaps to detect topic boundaries
- Generate chapter markers exportable for YouTube, podcast players, etc.
- **Value:** Saves creators 15-30 min of manual chapter creation per video
- **Complexity:** Medium — requires topic-segmentation logic (LLM or heuristic)

### 2. Smart Silence Shortener
- Instead of fully removing silences, shorten them to a user-configurable duration (e.g., 2s → 0.5s)
- Preserves natural speaking rhythm while tightening pacing
- **Value:** More natural-sounding output vs. hard cuts
- **Complexity:** Low — extend existing silence detection with a "trim to X" option

### 3. Speaker Diarization
- Detect and label different speakers in the transcript
- Per-speaker filler stats and editing filters
- **Value:** Essential for podcasts and interviews (multi-speaker is the norm)
- **Complexity:** Medium-High — requires a diarization model (pyannote, Whisper + post-processing, or a dedicated API)

### 4. Batch Processing
- Upload multiple videos and apply the same cleanup rules across all
- Queue-based processing with progress tracking
- **Value:** Content creators often record in batches (e.g., a week of YouTube videos)
- **Complexity:** Medium — queue management, parallel Whisper calls, UI for batch status

### 5. AI Rewrite Suggestions
- For sections with heavy filler usage, suggest a cleaner rephrasing using an LLM
- Users can accept/reject suggestions inline
- **Value:** Helps creators improve their scripts and speaking patterns over time
- **Complexity:** Medium — LLM integration on transcript segments, inline suggestion UI

### 6. Transcript Search & Replace
- Search for specific words/phrases across the transcript
- Bulk-delete, bulk-restore, or jump to occurrences
- **Value:** Quick cleanup of recurring verbal tics beyond standard fillers
- **Complexity:** Low — text search over existing transcript data

### 7. Confidence-Based Auto-Delete Threshold
- Expose Whisper's existing confidence scores to users
- Let users set a threshold below which words are auto-flagged for review
- Catches mumbled or unclear words automatically
- **Value:** Surfaces quality issues that filler detection alone misses
- **Complexity:** Low — data already exists, just needs UI exposure

---

## Tier 2 — Adjacent Features (Broadens Appeal)

Features that expand the audience while staying in the "video content cleanup & repurposing" space.

### 8. AI-Powered Clip Extraction
- Analyze transcript to find the best 30s / 60s / 90s clips from a longer video
- Score segments by completeness of thought, energy, topic relevance
- One-click export for Reels, TikTok, Shorts
- **Value:** Massive standalone value — tools like Opus Clip charge $20+/mo just for this
- **Complexity:** High — requires LLM-based segment scoring, aspect ratio reframing, clip export pipeline

### 9. Auto-Captions with Styling (Burned-In)
- Generate animated word-by-word captions (trendy TikTok/Reel style)
- Customizable fonts, colors, position, animation style
- Burned into the exported video via FFmpeg
- **Value:** Another feature people pay $15-20/mo for separately. Transcript data already exists
- **Complexity:** High — FFmpeg subtitle filter composition, animation timing, style customization UI

### 10. Audio Enhancement / Noise Reduction
- Client-side noise gate, EQ normalization, compression using Web Audio API
- Presets: "Clean Podcast," "Reduce Background Noise," "Normalize Volume"
- **Value:** Natural companion — "clean the content AND the audio"
- **Complexity:** Medium — Web Audio API processing, real-time preview, preset tuning

### 11. Intro/Outro Templates
- Attach simple branded intro/outro cards or bumpers to exports
- Template library with customizable text, colors, duration
- **Value:** Very common need for content creators; removes need for a separate tool
- **Complexity:** Medium — template rendering (Canvas or FFmpeg), concatenation in export pipeline

### 12. Text-Based Video Editing (Descript-Style)
- Edit the video entirely through the transcript — select text to cut, rearrange, etc.
- Drag-and-drop paragraph reordering
- **Value:** The app is already 80% of the way there. This formalizes it as a primary editing paradigm
- **Complexity:** Medium — mostly UX/interaction design, some transcript mutation logic for reordering

### 13. Webhook / Zapier Integration
- Fire a webhook when a project is exported
- Enable auto-upload to YouTube, Dropbox, Google Drive, etc.
- **Value:** Workflow automation for creators who publish on a schedule
- **Complexity:** Low-Medium — webhook dispatch from Convex, basic integration docs

### 14. AI Summary & Show Notes
- Generate a summary, key topics, timestamps, and show notes from the transcript
- Export as markdown, HTML, or plain text
- **Value:** Podcasters and YouTubers need this for every episode — currently done manually
- **Complexity:** Low-Medium — LLM call on transcript, formatting/export UI

---

## Tier 3 — Full Editor Evolution (Bigger Vision)

Features that move ClipCut toward a comprehensive AI-native video editor (Descript/CapCut competitor).

### 15. Multi-Track Timeline
- Support overlaying B-roll, images, or additional audio tracks on top of the primary video
- Drag-and-drop timeline with layer management
- **Value:** Transforms ClipCut from a cleanup tool into a real editor
- **Complexity:** Very High — full timeline engine, multi-track FFmpeg composition, layer UI

### 16. Text-to-Speech Gap Filler
- When a user deletes a section, optionally generate AI voice to bridge the gap
- Integration with ElevenLabs, OpenAI TTS, or similar
- **Value:** Fix mistakes without re-recording — game-changing for long-form content
- **Complexity:** High — TTS API integration, voice cloning/matching, seamless audio stitching

### 17. Built-In Screen Recording
- Record screen/camera directly in-app
- Go from capture → clean → export in one tool
- **Value:** Eliminates the need for OBS/Loom for tutorial creators
- **Complexity:** Medium-High — MediaRecorder API, recording UI, storage pipeline

### 18. Collaborative Editing
- Multi-user presence and editing on the same project
- Real-time cursors, comments, edit attribution
- **Value:** Teams (podcast producer + host, video editor + creator) can work together
- **Complexity:** Medium — Convex is already real-time, but conflict resolution and presence UI needed

### 19. Templates & Presets Library
- Shareable cleanup profiles: "Podcast Clean," "Lecture Tighten," "Interview Polish"
- Community-shared presets with different filler word lists, silence thresholds, export settings
- **Value:** Reduces setup friction, enables best-practice sharing
- **Complexity:** Low-Medium — preset schema, sharing mechanism, community gallery

### 20. AI Zoom / Reframe
- Auto-detect speaker's face and add Ken Burns-style zoom or smart reframe
- Landscape → portrait conversion for social media
- **Value:** Very popular for repurposing content across platforms
- **Complexity:** Very High — face detection (MediaPipe/TensorFlow.js), motion tracking, FFmpeg filter composition

---

## Implementation Priority Matrix

| # | Feature | Complexity | Value | Priority |
|---|---------|-----------|-------|----------|
| 6 | Transcript Search & Replace | Low | Medium | P0 |
| 7 | Confidence Threshold | Low | Medium | P0 |
| 2 | Smart Silence Shortener | Low | High | P0 |
| 14 | AI Summary & Show Notes | Low-Med | High | P1 |
| 1 | Auto Chapters | Medium | High | P1 |
| 12 | Text-Based Editing | Medium | Very High | P1 |
| 9 | Animated Captions | High | Very High | P1 |
| 8 | AI Clip Extraction | High | Very High | P1 |
| 3 | Speaker Diarization | Med-High | Very High | P1 |
| 10 | Audio Enhancement | Medium | High | P2 |
| 5 | AI Rewrite Suggestions | Medium | Medium | P2 |
| 4 | Batch Processing | Medium | High | P2 |
| 11 | Intro/Outro Templates | Medium | Medium | P2 |
| 13 | Webhook / Zapier | Low-Med | Medium | P2 |
| 19 | Templates & Presets Library | Low-Med | Medium | P2 |
| 17 | Built-In Screen Recording | Med-High | High | P3 |
| 18 | Collaborative Editing | Medium | High | P3 |
| 16 | TTS Gap Filler | High | High | P3 |
| 15 | Multi-Track Timeline | Very High | Very High | P3 |
| 20 | AI Zoom / Reframe | Very High | High | P3 |

---

## Notes

- **Privacy-first principle:** Features should maintain the client-side processing philosophy where possible. Server-side processing (LLM calls, TTS, diarization) should be opt-in and clearly communicated.
- **Monetization:** Tier 2-3 features naturally form premium/pro tier offerings. Tier 1 could remain in a generous free tier.
- **Tech debt consideration:** Before adding Tier 3 features, the timeline and export pipeline may need architectural rework to support multi-track composition.
