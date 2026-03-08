import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles.css";
import { Timeline } from "../components/Timeline";
import { ExportButton } from "../components/ExportButton";
import { computeKeptSegments } from "../lib/video-export";
import { useUndoRedo } from "../lib/use-undo-redo";
import { useVideoPlayer } from "../lib/use-video-player";
import { useToast } from "../components/Toast";
import { ThemeToggleButton } from "../components/ThemeToggle";
import { EditingStats } from "../components/EditingStats";
import { FillerWordChart } from "../components/FillerWordChart";

export const Route = createFileRoute("/try")({
  component: TryPage,
});

type TranscriptWord = {
  word: string;
  start: number;
  end: number;
  isFiller: boolean;
  isDeleted: boolean;
};

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Generate a realistic-looking transcript with fillers based on video duration.
 * Since we can't run Whisper without auth, we simulate what the AI would produce.
 */
function generateSampleTranscript(duration: number): TranscriptWord[] {
  const words: TranscriptWord[] = [];
  // Base sentences with fillers interspersed
  const sentences = [
    { text: "So today I wanted to share", fillerBefore: "So", fillerWord: true },
    { text: "some thoughts about", fillerBefore: null, fillerWord: false },
    { text: "um this topic that", fillerBefore: "um", fillerWord: true },
    { text: "I've been thinking about", fillerBefore: null, fillerWord: false },
    { text: "for a while now", fillerBefore: null, fillerWord: false },
    { text: "The first thing is", fillerBefore: null, fillerWord: false },
    { text: "uh really important", fillerBefore: "uh", fillerWord: true },
    { text: "because it affects", fillerBefore: null, fillerWord: false },
    { text: "how we approach", fillerBefore: null, fillerWord: false },
    { text: "like the whole problem", fillerBefore: "like", fillerWord: true },
    { text: "And then there's also", fillerBefore: null, fillerWord: false },
    { text: "the second aspect which", fillerBefore: null, fillerWord: false },
    { text: "you know connects to", fillerBefore: "you know", fillerWord: true },
    { text: "what I just said", fillerBefore: null, fillerWord: false },
    { text: "I mean if you think", fillerBefore: "I mean", fillerWord: true },
    { text: "about it carefully", fillerBefore: null, fillerWord: false },
    { text: "it makes a lot of sense", fillerBefore: null, fillerWord: false },
    { text: "um to focus on", fillerBefore: "um", fillerWord: true },
    { text: "the core fundamentals", fillerBefore: null, fillerWord: false },
    { text: "rather than getting", fillerBefore: null, fillerWord: false },
    { text: "uh distracted by", fillerBefore: "uh", fillerWord: true },
    { text: "less important details", fillerBefore: null, fillerWord: false },
    { text: "So in conclusion", fillerBefore: "So", fillerWord: true },
    { text: "I think we should", fillerBefore: null, fillerWord: false },
    { text: "definitely consider", fillerBefore: null, fillerWord: false },
    { text: "this approach going forward", fillerBefore: null, fillerWord: false },
    { text: "Thank you for listening", fillerBefore: null, fillerWord: false },
  ];

  let cursor = 0.5;
  const avgWordDuration = 0.35;
  const avgGap = 0.1;
  const fillerWords = new Set(["So", "um", "uh", "like", "you know", "I mean"]);

  // Scale to fit duration: repeat sentences if needed
  const targetEnd = duration - 1;
  let sentenceIdx = 0;

  while (cursor < targetEnd && sentenceIdx < 200) {
    const sentence = sentences[sentenceIdx % sentences.length];
    const sentenceWords = sentence.text.split(" ");

    // Add silence gap every ~8 sentences
    if (sentenceIdx > 0 && sentenceIdx % 8 === 0 && cursor < targetEnd - 3) {
      const silenceDuration = 2.0 + Math.random() * 1.5;
      words.push({
        word: `[silence ${silenceDuration.toFixed(1)}s]`,
        start: cursor,
        end: cursor + silenceDuration,
        isFiller: true,
        isDeleted: false,
      });
      cursor += silenceDuration;
    }

    for (const w of sentenceWords) {
      if (cursor >= targetEnd) break;
      const wordDuration = avgWordDuration + (Math.random() - 0.5) * 0.15;
      const isFiller = fillerWords.has(w);

      words.push({
        word: w,
        start: cursor,
        end: cursor + wordDuration,
        isFiller,
        isDeleted: false,
      });
      cursor += wordDuration + avgGap;
    }

    // Small pause between sentences
    cursor += 0.3 + Math.random() * 0.4;
    sentenceIdx++;
  }

  return words;
}

function TryPage() {
  const { addToast } = useToast();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    videoRef,
    currentTime,
    duration: videoDuration,
    isPlaying,
    seekTo: seekToTime,
    togglePlayPause,
    seekRelative,
    playbackRate,
    setPlaybackRate,
    volume,
    setVolume,
  } = useVideoPlayer(videoUrl);

  const {
    state: transcript,
    set: setTranscript,
    undo: undoTranscript,
    redo: redoTranscript,
    reset: resetTranscript,
    canUndo,
    canRedo,
  } = useUndoRedo<TranscriptWord[]>([]);

  const [previewMode, setPreviewMode] = useState(false);
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const lastClickedIndex = useRef<number | null>(null);

  // Generate transcript once we know the video duration
  useEffect(() => {
    if (videoDuration > 0 && videoUrl && !hasGenerated) {
      const generated = generateSampleTranscript(videoDuration);
      resetTranscript(generated);
      setHasGenerated(true);
      addToast(
        "Sample transcript generated! Sign up for real AI transcription.",
        "info"
      );
    }
  }, [videoDuration, videoUrl, hasGenerated, resetTranscript, addToast]);

  // Clean up blob URL
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  function processFile(file: File) {
    if (!file.type.startsWith("video/")) {
      addToast("Please select a video file (MP4, MOV, WebM).", "warning");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      addToast(
        `File is too large. Free trial is limited to ${MAX_FILE_SIZE_MB}MB. Sign up for unlimited uploads.`,
        "warning"
      );
      return;
    }
    if (videoUrl) {
      addToast(
        "Free trial is limited to 1 video. Sign up for unlimited projects.",
        "warning"
      );
      return;
    }

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoFileName(file.name.replace(/\.[^/.]+$/, ""));
    setHasGenerated(false);
  }

  const duration = videoDuration || 0;
  const hasTranscript = transcript.length > 0;

  const keptSegments = useMemo(
    () =>
      hasTranscript && duration > 0
        ? computeKeptSegments(transcript, duration)
        : [],
    [transcript, duration, hasTranscript]
  );

  // Preview mode
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !previewMode || keptSegments.length === 0) return;
    const onTimeUpdate = () => {
      const t = video.currentTime;
      const currentSeg = keptSegments.find(
        (s) => t >= s.start - 0.05 && t < s.end
      );
      if (!currentSeg) {
        const nextSeg = keptSegments.find((s) => s.start > t);
        if (nextSeg) video.currentTime = nextSeg.start;
        else video.pause();
      }
    };
    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [previewMode, keptSegments]);

  const toggleWordDeleted = useCallback(
    (index: number) => {
      setTranscript((prev) =>
        prev.map((w, i) =>
          i === index ? { ...w, isDeleted: !w.isDeleted } : w
        )
      );
    },
    [setTranscript]
  );

  const seekToWord = useCallback(
    (word: TranscriptWord) => seekToTime(word.start),
    [seekToTime]
  );

  const deleteAllFillers = useCallback(() => {
    setTranscript((prev) =>
      prev.map((w) => (w.isFiller ? { ...w, isDeleted: true } : w))
    );
    addToast("All fillers removed", "success");
  }, [setTranscript, addToast]);

  const deleteAllSilences = useCallback(() => {
    setTranscript((prev) =>
      prev.map((w) =>
        w.word.startsWith("[silence") ? { ...w, isDeleted: true } : w
      )
    );
    addToast("All silences removed", "success");
  }, [setTranscript, addToast]);

  const restoreAll = useCallback(() => {
    setTranscript((prev) => prev.map((w) => ({ ...w, isDeleted: false })));
    addToast("All words restored", "info");
  }, [setTranscript, addToast]);

  const handleWordClick = useCallback(
    (index: number, e: React.MouseEvent) => {
      if (e.shiftKey && lastClickedIndex.current !== null) {
        const start = Math.min(lastClickedIndex.current, index);
        const end = Math.max(lastClickedIndex.current, index);
        const newSelection = new Set<number>();
        for (let i = start; i <= end; i++) newSelection.add(i);
        setSelection(newSelection);
        return;
      }
      lastClickedIndex.current = index;
      setSelection(new Set());
      const word = transcript[index];
      if (word.isDeleted) toggleWordDeleted(index);
      else seekToWord(word);
    },
    [transcript, toggleWordDeleted, seekToWord]
  );

  const deleteSelection = useCallback(() => {
    if (selection.size === 0) return;
    setTranscript((prev) =>
      prev.map((w, i) => (selection.has(i) ? { ...w, isDeleted: true } : w))
    );
    setSelection(new Set());
  }, [selection, setTranscript]);

  const restoreSelection = useCallback(() => {
    if (selection.size === 0) return;
    setTranscript((prev) =>
      prev.map((w, i) => (selection.has(i) ? { ...w, isDeleted: false } : w))
    );
    setSelection(new Set());
  }, [selection, setTranscript]);

  const handleUndo = useCallback(() => undoTranscript(), [undoTranscript]);
  const handleRedo = useCallback(() => redoTranscript(), [redoTranscript]);

  const handleTimelineSelect = useCallback(
    (start: number, end: number) => {
      setTranscript((prev) =>
        prev.map((w) => {
          if (w.start >= start && w.end <= end) {
            return { ...w, isDeleted: true };
          }
          return w;
        })
      );
      addToast("Selected range deleted", "success");
    },
    [setTranscript, addToast]
  );

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (
        ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) ||
        ((e.ctrlKey || e.metaKey) && e.key === "y")
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlayPause();
          break;
        case "p":
          if (!e.metaKey && !e.ctrlKey) setPreviewMode((p) => !p);
          break;
        case "ArrowLeft":
          seekRelative(-5);
          break;
        case "ArrowRight":
          seekRelative(5);
          break;
        case "?":
          setShowShortcuts((s) => !s);
          break;
        case "]":
          setPlaybackRate(Math.min(4, playbackRate + 0.25));
          break;
        case "[":
          setPlaybackRate(Math.max(0.25, playbackRate - 0.25));
          break;
        case "m":
          if (!e.metaKey && !e.ctrlKey) setVolume(volume === 0 ? 1 : 0);
          break;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleUndo,
    handleRedo,
    togglePlayPause,
    seekRelative,
    playbackRate,
    volume,
    setPlaybackRate,
    setVolume,
  ]);

  const fillerCount = transcript.filter(
    (w) => w.isFiller && !w.word.startsWith("[silence")
  ).length;
  const deletedCount = transcript.filter((w) => w.isDeleted).length;
  const silenceCount = transcript.filter((w) =>
    w.word.startsWith("[silence")
  ).length;

  // Upload screen
  if (!videoUrl) {
    return (
      <div className="min-h-screen bg-surface">
        <header className="border-b border-surface-lighter px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <Link
              to="/"
              className="text-xl font-bold text-white sm:text-2xl"
            >
              ClipCut <span className="text-primary">AI</span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggleButton />
              <Link
                to="/demo"
                className="rounded-md bg-surface-lighter px-3 py-1 text-sm text-text-muted transition-colors hover:text-white"
              >
                Demo
              </Link>
              <Link
                to="/"
                className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
              >
                Sign In
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="mb-8 text-center">
            <h2 className="mb-3 text-2xl font-bold text-white sm:text-4xl">
              Try ClipCut AI free
            </h2>
            <p className="text-base text-text-muted sm:text-lg">
              Upload a video to try the editing experience. No account required.
            </p>
            <p className="mt-2 text-sm text-text-muted/70">
              Free trial: 1 video, up to {MAX_FILE_SIZE_MB}MB. Sign up for
              unlimited AI-powered transcription.
            </p>
          </div>

          <label
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) processFile(file);
            }}
            className={`flex w-full cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-8 py-16 transition-all ${
              isDragging
                ? "border-primary bg-primary/20 scale-[1.02]"
                : "border-surface-lighter hover:border-primary hover:bg-surface-light"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processFile(file);
              }}
            />
            <div className="mb-4 text-5xl">&#127916;</div>
            <p className="mb-1 text-lg font-medium text-white">
              {isDragging
                ? "Drop your video here"
                : "Drop a video or click to browse"}
            </p>
            <p className="text-sm text-text-muted">
              MP4, MOV, WebM up to {MAX_FILE_SIZE_MB}MB
            </p>
          </label>

          <div className="mt-8 rounded-lg border border-surface-lighter bg-surface-light p-4">
            <h3 className="mb-2 text-sm font-medium text-white">
              What you get in the free trial:
            </h3>
            <ul className="space-y-1.5 text-sm text-text-muted">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-success">&#10003;</span>
                Full video player with playback controls
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-success">&#10003;</span>
                Sample transcript editing (click, delete, undo/redo)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-success">&#10003;</span>
                Timeline visualization with waveform
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-success">&#10003;</span>
                Video export with your edits applied
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-success">&#10003;</span>
                Subtitle export (SRT, VTT, TXT)
              </li>
            </ul>
            <div className="mt-3 border-t border-surface-lighter pt-3">
              <h4 className="text-sm font-medium text-white">
                Sign up to unlock:
              </h4>
              <ul className="mt-1.5 space-y-1.5 text-sm text-text-muted">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">&#9733;</span>
                  AI-powered transcription (real filler word detection)
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">&#9733;</span>
                  Unlimited projects with cloud storage
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">&#9733;</span>
                  No file size limits
                </li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Editor screen (video loaded)
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-surface-lighter px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-2 sm:gap-4">
          <Link
            to="/try"
            onClick={(e) => {
              e.preventDefault();
              if (videoUrl) URL.revokeObjectURL(videoUrl);
              setVideoUrl(null);
              setHasGenerated(false);
              resetTranscript([]);
            }}
            className="shrink-0 text-text-muted transition-colors hover:text-white"
          >
            &larr; <span className="hidden sm:inline">New Video</span>
          </Link>
          <h1 className="min-w-0 truncate text-base font-semibold text-white sm:text-lg">
            {videoFileName || "Untitled Video"}
          </h1>
          <span className="ml-1 shrink-0 rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning sm:ml-2">
            free trial
          </span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggleButton />
            <Link
              to="/"
              className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Trial notice */}
      <div className="border-b border-warning/20 bg-warning/5 px-4 py-2 text-center text-sm text-warning">
        Free trial mode &mdash; transcript is simulated. Sign up for real
        AI-powered transcription of your videos.
      </div>

      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_400px]">
          {/* Video Player */}
          <div>
            <div className="overflow-hidden rounded-lg bg-black">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="aspect-video w-full"
              />
            </div>

            {/* Playback Controls */}
            <div className="mt-3 flex items-center gap-3 rounded-lg bg-surface-light p-2 sm:mt-4 sm:p-3">
              <button
                onClick={togglePlayPause}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setVolume(volume === 0 ? 1 : 0)}
                  className="text-sm text-text-muted hover:text-white"
                  title="Mute/Unmute (M)"
                >
                  {volume === 0
                    ? "\u{1F509}"
                    : volume < 0.5
                      ? "\u{1F508}"
                      : "\u{1F50A}"}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-16 accent-primary"
                />
              </div>
              <div className="flex items-center gap-1.5 text-sm text-text-muted">
                <span>Speed:</span>
                {[0.5, 1, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setPlaybackRate(rate)}
                    className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
                      playbackRate === rate
                        ? "bg-primary text-white"
                        : "bg-surface-lighter text-text-muted hover:text-white"
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
              <span className="ml-auto text-xs text-text-muted tabular-nums">
                {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
              </span>
              <button
                onClick={() => setShowShortcuts(true)}
                className="rounded-md bg-surface-lighter px-2 py-1 text-xs text-text-muted transition-colors hover:text-white"
                title="Keyboard shortcuts (?)"
              >
                ?
              </button>
            </div>

            {/* Stats & Actions Bar */}
            {hasTranscript && (
              <div className="mt-2 flex flex-wrap gap-3 rounded-lg bg-surface-light p-3 sm:gap-4 sm:p-4">
                <div className="text-sm">
                  <span className="text-text-muted">Words: </span>
                  <span className="font-medium text-white">
                    {transcript.length - silenceCount}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-text-muted">Fillers: </span>
                  <span className="font-medium text-filler">
                    {fillerCount}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-text-muted">Silences: </span>
                  <span className="font-medium text-filler">
                    {silenceCount}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-text-muted">Deleted: </span>
                  <span className="font-medium text-deleted">
                    {deletedCount}
                  </span>
                </div>
                <div className="ml-auto flex flex-wrap gap-2">
                  <button
                    onClick={handleUndo}
                    disabled={!canUndo}
                    className="rounded-md bg-surface-lighter px-2.5 py-1 text-sm font-medium text-text-muted transition-colors hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Undo (Ctrl+Z)"
                  >
                    &#8630;
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={!canRedo}
                    className="rounded-md bg-surface-lighter px-2.5 py-1 text-sm font-medium text-text-muted transition-colors hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Redo (Ctrl+Shift+Z)"
                  >
                    &#8631;
                  </button>
                  <button
                    onClick={() => setPreviewMode((p) => !p)}
                    className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                      previewMode
                        ? "bg-primary text-white"
                        : "bg-surface-lighter text-text-muted hover:text-white"
                    }`}
                    title="Preview playback with deleted segments skipped (P)"
                  >
                    {previewMode ? "Preview On" : "Preview"}
                  </button>
                </div>
                <div className="flex w-full flex-wrap gap-2 border-t border-surface-lighter pt-2">
                  <span className="self-center text-xs text-text-muted">
                    Quick actions:
                  </span>
                  <button
                    onClick={deleteAllFillers}
                    className="rounded-md bg-warning/20 px-3 py-1 text-xs font-medium text-warning transition-colors hover:bg-warning/30"
                  >
                    Remove All Fillers ({fillerCount})
                  </button>
                  <button
                    onClick={deleteAllSilences}
                    className="rounded-md bg-warning/20 px-3 py-1 text-xs font-medium text-warning transition-colors hover:bg-warning/30"
                  >
                    Remove All Silences ({silenceCount})
                  </button>
                  <button
                    onClick={restoreAll}
                    className="rounded-md bg-surface-lighter px-3 py-1 text-xs font-medium text-text-muted transition-colors hover:text-white"
                  >
                    Restore All
                  </button>
                  <button
                    onClick={() => setShowBeforeAfter((p) => !p)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      showBeforeAfter
                        ? "bg-primary text-white"
                        : "bg-surface-lighter text-text-muted hover:text-white"
                    }`}
                    data-testid="before-after-btn"
                  >
                    {showBeforeAfter ? "Hide Compare" : "Compare"}
                  </button>
                </div>
              </div>
            )}

            {/* Before/After Compare */}
            {showBeforeAfter && hasTranscript && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2" data-testid="before-after-panel">
                <div className="rounded-lg border border-surface-lighter bg-surface-light p-3">
                  <h4 className="mb-2 text-xs font-medium text-text-muted">Before</h4>
                  <p className="text-sm text-text leading-relaxed">
                    {transcript.map((w) => w.word).join(" ")}
                  </p>
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <h4 className="mb-2 text-xs font-medium text-primary">After</h4>
                  <p className="text-sm text-text leading-relaxed">
                    {transcript
                      .filter((w) => !w.isDeleted)
                      .map((w) => w.word)
                      .join(" ")}
                  </p>
                </div>
              </div>
            )}

            {/* Editing Stats & Filler Chart */}
            {hasTranscript && (
              <>
                <EditingStats transcript={transcript} duration={duration} />
                <FillerWordChart transcript={transcript} />
              </>
            )}

            {/* Timeline */}
            {hasTranscript && duration > 0 && (
              <Timeline
                transcript={transcript}
                duration={duration}
                currentTime={currentTime}
                onSeek={seekToTime}
                onSelectRange={handleTimelineSelect}
              />
            )}

            {/* Export */}
            {hasTranscript && videoUrl && duration > 0 && (
              <ExportButton
                videoUrl={videoUrl}
                transcript={transcript}
                videoDuration={duration}
                projectName={videoFileName || "trial-export"}
              />
            )}
          </div>

          {/* Transcript Panel */}
          <div className="rounded-lg border border-surface-lighter bg-surface-light">
            <div className="border-b border-surface-lighter px-4 py-3">
              <h2 className="font-semibold text-white">Transcript</h2>
              <p className="mt-1 text-xs text-text-muted">
                {hasTranscript
                  ? "Click to seek. Double-click to delete/restore. Shift+click to select a range."
                  : "Loading transcript..."}
              </p>
              <p className="mt-1 text-xs text-warning/70">
                Sample transcript &mdash; sign up for real AI transcription.
              </p>
            </div>
            <div className="max-h-[40vh] overflow-y-auto p-4 lg:max-h-[60vh]">
              {hasTranscript ? (
                <>
                  <div className="flex flex-wrap gap-1">
                    {transcript.map((word, index) => {
                      const isActive =
                        currentTime >= word.start && currentTime < word.end;
                      const isSilence = word.word.startsWith("[silence");
                      const isSelected = selection.has(index);
                      return (
                        <button
                          key={index}
                          onClick={(e) => handleWordClick(index, e)}
                          onDoubleClick={() => toggleWordDeleted(index)}
                          title={`${word.start.toFixed(1)}s - ${word.end.toFixed(1)}s${word.isFiller ? (isSilence ? " (silence)" : " (filler)") : ""}`}
                          className={`inline-block rounded px-1.5 py-0.5 text-sm transition-all ${
                            isSelected
                              ? "bg-primary/30 text-white ring-1 ring-primary"
                              : word.isDeleted
                                ? "bg-deleted/10 text-deleted line-through opacity-50"
                                : isSilence
                                  ? "bg-warning/10 text-warning/70 italic text-xs"
                                  : word.isFiller
                                    ? "bg-filler/20 text-filler hover:bg-filler/30"
                                    : "text-text hover:bg-surface-lighter"
                          } ${isActive && !isSelected ? "ring-2 ring-primary" : ""}`}
                        >
                          {word.word}
                        </button>
                      );
                    })}
                  </div>

                  {selection.size > 0 && (
                    <div className="sticky bottom-0 mt-2 flex items-center gap-2 rounded-lg border border-surface-lighter bg-surface p-2">
                      <span className="text-xs text-text-muted">
                        {selection.size} word{selection.size > 1 ? "s" : ""}{" "}
                        selected
                      </span>
                      <button
                        onClick={deleteSelection}
                        className="ml-auto rounded-md bg-danger/20 px-3 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/30"
                      >
                        Delete Selected
                      </button>
                      <button
                        onClick={restoreSelection}
                        className="rounded-md bg-success/20 px-3 py-1 text-xs font-medium text-success transition-colors hover:bg-success/30"
                      >
                        Restore Selected
                      </button>
                      <button
                        onClick={() => setSelection(new Set())}
                        className="rounded-md bg-surface-lighter px-2 py-1 text-xs text-text-muted transition-colors hover:text-white"
                      >
                        &#10005;
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 text-4xl animate-spin">&#9881;</div>
                  <p className="text-sm text-text-muted">
                    Generating sample transcript...
                  </p>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="border-t border-surface-lighter px-4 py-3">
              <div className="flex flex-wrap gap-4 text-xs text-text-muted">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded bg-filler/30" />
                  Filler
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded bg-warning/20" />
                  Silence
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded bg-deleted/30" />
                  Deleted
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded ring-2 ring-primary" />
                  Current
                </div>
              </div>
              <div className="mt-2 hidden text-xs text-text-muted/60 sm:block">
                Press{" "}
                <kbd className="rounded bg-surface-lighter px-1 py-0.5">?</kbd>{" "}
                for keyboard shortcuts
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-surface-lighter bg-surface-light p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-xl text-text-muted hover:text-white"
              >
                &times;
              </button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ["Space", "Play / Pause"],
                ["P", "Toggle preview mode"],
                ["\u2190 / \u2192", "Seek back / forward 5s"],
                ["[ / ]", "Slow down / Speed up playback"],
                ["M", "Mute / Unmute"],
                ["Ctrl+Z", "Undo"],
                ["Ctrl+Shift+Z", "Redo"],
                ["Shift+Click", "Select word range"],
                ["Double-click", "Delete / Restore word"],
                ["?", "Toggle this help"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between">
                  <kbd className="rounded border border-surface-lighter bg-surface px-2 py-1 text-xs font-mono text-white">
                    {key}
                  </kbd>
                  <span className="text-text-muted">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
