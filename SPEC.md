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
- [ ] Create a **Convex Action** to extract audio (using FFmpeg) and send to Whisper.
- [ ] Develop logic to flag "ums/uhs" and silences in the returned JSON timestamps.
- [ ] Update the UI to highlight these segments automatically for user review.

### Phase 3: The Editing Engine
- [x] Implement "Delete word" functionality (updates `isDeleted` in Convex).
- [ ] Build the timeline "Cut" logic using the transcript timestamps.
- [ ] Integrate `ffmpeg.wasm` to stitch segments together based on the `isDeleted` flags in the browser.

### Phase 4: Optimization & Polish
- [ ] Add **Local-First caching** for video files to reduce repeated downloads.
- [ ] Implement multi-device project syncing via **Clerk** or **Convex Auth**.
- [x] Finalize "One-Click Clean" feature to auto-delete all flagged fillers.

---
*Project: ClipCut AI | 2026*
