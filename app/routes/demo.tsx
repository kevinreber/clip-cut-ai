import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles.css";
import { Timeline } from "../components/Timeline";
import { computeKeptSegments } from "../lib/video-export";
import { useUndoRedo } from "../lib/use-undo-redo";
import { useVideoPlayer } from "../lib/use-video-player";
import { useToast } from "../components/Toast";
import { ThemeToggleButton } from "../components/ThemeToggle";
import {
  generateSrt,
  generateVtt,
  generatePlainText,
  downloadTextFile,
} from "../lib/subtitle-export";

export const Route = createFileRoute("/demo")({
  component: DemoPage,
});

type TranscriptWord = {
  word: string;
  start: number;
  end: number;
  isFiller: boolean;
  isDeleted: boolean;
};

// A realistic sample transcript simulating a tech talk with fillers, silences, and repetitions
const DEMO_TRANSCRIPT: TranscriptWord[] = [
  { word: "So", start: 0.5, end: 0.8, isFiller: true, isDeleted: false },
  { word: "welcome", start: 0.9, end: 1.3, isFiller: false, isDeleted: false },
  { word: "everyone", start: 1.35, end: 1.8, isFiller: false, isDeleted: false },
  { word: "to", start: 1.85, end: 2.0, isFiller: false, isDeleted: false },
  { word: "today's", start: 2.05, end: 2.5, isFiller: false, isDeleted: false },
  { word: "presentation", start: 2.55, end: 3.2, isFiller: false, isDeleted: false },
  { word: "on", start: 3.25, end: 3.4, isFiller: false, isDeleted: false },
  { word: "um", start: 3.5, end: 3.9, isFiller: true, isDeleted: false },
  { word: "building", start: 4.0, end: 4.5, isFiller: false, isDeleted: false },
  { word: "modern", start: 4.55, end: 4.9, isFiller: false, isDeleted: false },
  { word: "web", start: 4.95, end: 5.2, isFiller: false, isDeleted: false },
  { word: "applications", start: 5.25, end: 6.0, isFiller: false, isDeleted: false },
  { word: "[silence 2.3s]", start: 6.0, end: 8.3, isFiller: true, isDeleted: false },
  { word: "I", start: 8.4, end: 8.5, isFiller: false, isDeleted: false },
  { word: "want", start: 8.55, end: 8.8, isFiller: false, isDeleted: false },
  { word: "to", start: 8.85, end: 9.0, isFiller: false, isDeleted: false },
  { word: "talk", start: 9.05, end: 9.3, isFiller: false, isDeleted: false },
  { word: "about", start: 9.35, end: 9.6, isFiller: false, isDeleted: false },
  { word: "uh", start: 9.7, end: 10.1, isFiller: true, isDeleted: false },
  { word: "three", start: 10.2, end: 10.5, isFiller: false, isDeleted: false },
  { word: "key", start: 10.55, end: 10.8, isFiller: false, isDeleted: false },
  { word: "principles", start: 10.85, end: 11.4, isFiller: false, isDeleted: false },
  { word: "that", start: 11.5, end: 11.7, isFiller: false, isDeleted: false },
  { word: "I", start: 11.75, end: 11.9, isFiller: false, isDeleted: false },
  { word: "think", start: 11.95, end: 12.2, isFiller: false, isDeleted: false },
  { word: "are", start: 12.25, end: 12.4, isFiller: false, isDeleted: false },
  { word: "like", start: 12.5, end: 12.8, isFiller: true, isDeleted: false },
  { word: "really", start: 12.85, end: 13.2, isFiller: false, isDeleted: false },
  { word: "really", start: 13.25, end: 13.6, isFiller: true, isDeleted: false },
  { word: "important", start: 13.65, end: 14.2, isFiller: false, isDeleted: false },
  { word: "for", start: 14.3, end: 14.5, isFiller: false, isDeleted: false },
  { word: "developers", start: 14.55, end: 15.1, isFiller: false, isDeleted: false },
  { word: "hmm", start: 15.2, end: 15.7, isFiller: true, isDeleted: false },
  { word: "The", start: 15.8, end: 16.0, isFiller: false, isDeleted: false },
  { word: "first", start: 16.05, end: 16.3, isFiller: false, isDeleted: false },
  { word: "principle", start: 16.35, end: 16.9, isFiller: false, isDeleted: false },
  { word: "is", start: 16.95, end: 17.1, isFiller: false, isDeleted: false },
  { word: "performance", start: 17.15, end: 17.8, isFiller: false, isDeleted: false },
  { word: "[silence 2.5s]", start: 17.8, end: 20.3, isFiller: true, isDeleted: false },
  { word: "You", start: 20.4, end: 20.6, isFiller: false, isDeleted: false },
  { word: "know", start: 20.65, end: 20.9, isFiller: false, isDeleted: false },
  { word: "users", start: 20.95, end: 21.3, isFiller: false, isDeleted: false },
  { word: "expect", start: 21.35, end: 21.7, isFiller: false, isDeleted: false },
  { word: "um", start: 21.8, end: 22.2, isFiller: true, isDeleted: false },
  { word: "fast", start: 22.3, end: 22.6, isFiller: false, isDeleted: false },
  { word: "loading", start: 22.65, end: 23.0, isFiller: false, isDeleted: false },
  { word: "times", start: 23.05, end: 23.3, isFiller: false, isDeleted: false },
  { word: "and", start: 23.4, end: 23.6, isFiller: false, isDeleted: false },
  { word: "smooth", start: 23.65, end: 24.0, isFiller: false, isDeleted: false },
  { word: "interactions", start: 24.05, end: 24.7, isFiller: false, isDeleted: false },
  { word: "The", start: 25.0, end: 25.2, isFiller: false, isDeleted: false },
  { word: "second", start: 25.25, end: 25.6, isFiller: false, isDeleted: false },
  { word: "is", start: 25.65, end: 25.8, isFiller: false, isDeleted: false },
  { word: "uh", start: 25.9, end: 26.3, isFiller: true, isDeleted: false },
  { word: "accessibility", start: 26.4, end: 27.2, isFiller: false, isDeleted: false },
  { word: "I", start: 27.3, end: 27.4, isFiller: false, isDeleted: false },
  { word: "mean", start: 27.45, end: 27.7, isFiller: true, isDeleted: false },
  { word: "making", start: 27.8, end: 28.1, isFiller: false, isDeleted: false },
  { word: "sure", start: 28.15, end: 28.4, isFiller: false, isDeleted: false },
  { word: "your", start: 28.45, end: 28.6, isFiller: false, isDeleted: false },
  { word: "app", start: 28.65, end: 28.9, isFiller: false, isDeleted: false },
  { word: "works", start: 28.95, end: 29.2, isFiller: false, isDeleted: false },
  { word: "for", start: 29.25, end: 29.4, isFiller: false, isDeleted: false },
  { word: "everyone", start: 29.45, end: 30.0, isFiller: false, isDeleted: false },
  { word: "[silence 3.1s]", start: 30.0, end: 33.1, isFiller: true, isDeleted: false },
  { word: "And", start: 33.2, end: 33.4, isFiller: false, isDeleted: false },
  { word: "the", start: 33.45, end: 33.6, isFiller: false, isDeleted: false },
  { word: "third", start: 33.65, end: 33.9, isFiller: false, isDeleted: false },
  { word: "thing", start: 33.95, end: 34.2, isFiller: false, isDeleted: false },
  { word: "is", start: 34.25, end: 34.4, isFiller: false, isDeleted: false },
  { word: "is", start: 34.45, end: 34.6, isFiller: true, isDeleted: false },
  { word: "developer", start: 34.65, end: 35.2, isFiller: false, isDeleted: false },
  { word: "experience", start: 35.25, end: 35.8, isFiller: false, isDeleted: false },
  { word: "You", start: 36.0, end: 36.2, isFiller: false, isDeleted: false },
  { word: "need", start: 36.25, end: 36.5, isFiller: false, isDeleted: false },
  { word: "good", start: 36.55, end: 36.8, isFiller: false, isDeleted: false },
  { word: "tooling", start: 36.85, end: 37.3, isFiller: false, isDeleted: false },
  { word: "um", start: 37.4, end: 37.8, isFiller: true, isDeleted: false },
  { word: "type", start: 37.9, end: 38.2, isFiller: false, isDeleted: false },
  { word: "safety", start: 38.25, end: 38.6, isFiller: false, isDeleted: false },
  { word: "and", start: 38.7, end: 38.9, isFiller: false, isDeleted: false },
  { word: "you know", start: 39.0, end: 39.5, isFiller: true, isDeleted: false },
  { word: "clear", start: 39.6, end: 39.9, isFiller: false, isDeleted: false },
  { word: "documentation", start: 39.95, end: 40.7, isFiller: false, isDeleted: false },
  { word: "So", start: 41.0, end: 41.2, isFiller: true, isDeleted: false },
  { word: "that's", start: 41.3, end: 41.6, isFiller: false, isDeleted: false },
  { word: "basically", start: 41.65, end: 42.1, isFiller: false, isDeleted: false },
  { word: "it", start: 42.15, end: 42.3, isFiller: false, isDeleted: false },
  { word: "thank", start: 42.5, end: 42.8, isFiller: false, isDeleted: false },
  { word: "you", start: 42.85, end: 43.1, isFiller: false, isDeleted: false },
];

const DEMO_DURATION = 45; // seconds

function DemoPage() {
  const { addToast } = useToast();

  // Use a public-domain sample video (Big Buck Bunny)
  const demoVideoUrl =
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

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
  } = useVideoPlayer(demoVideoUrl);

  const duration = videoDuration || DEMO_DURATION;

  const {
    state: transcript,
    set: setTranscript,
    undo: undoTranscript,
    redo: redoTranscript,
    reset: resetTranscript,
    canUndo,
    canRedo,
  } = useUndoRedo<TranscriptWord[]>(DEMO_TRANSCRIPT);

  const [previewMode, setPreviewMode] = useState(false);
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const lastClickedIndex = useRef<number | null>(null);

  const keptSegments = useMemo(
    () =>
      transcript.length > 0 && duration > 0
        ? computeKeptSegments(transcript, duration)
        : [],
    [transcript, duration]
  );

  // Preview mode: skip deleted segments during playback
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
        if (nextSeg) {
          video.currentTime = nextSeg.start;
        } else {
          video.pause();
        }
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
        for (let i = start; i <= end; i++) {
          newSelection.add(i);
        }
        setSelection(newSelection);
        return;
      }

      lastClickedIndex.current = index;
      setSelection(new Set());
      const word = transcript[index];
      if (word.isDeleted) {
        toggleWordDeleted(index);
      } else {
        seekToWord(word);
      }
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

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-surface-lighter px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-2 sm:gap-4">
          <Link
            to="/"
            className="shrink-0 text-text-muted transition-colors hover:text-white"
          >
            &larr; <span className="hidden sm:inline">Home</span>
          </Link>
          <h1 className="min-w-0 truncate text-base font-semibold text-white sm:text-lg">
            Demo: Tech Talk Presentation
          </h1>
          <span className="ml-1 shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary sm:ml-2">
            demo
          </span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggleButton />
            <Link
              to="/"
              className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </header>

      {/* Demo banner */}
      <div className="border-b border-primary/20 bg-primary/5 px-4 py-2 text-center text-sm text-primary">
        This is a demo with a sample video and transcript. Sign up to use your
        own videos with AI-powered transcription.
      </div>

      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_400px]">
          {/* Video Player */}
          <div>
            <div className="overflow-hidden rounded-lg bg-black">
              <video
                ref={videoRef}
                src={demoVideoUrl}
                controls
                crossOrigin="anonymous"
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
            <div className="mt-2 flex flex-wrap gap-3 rounded-lg bg-surface-light p-3 sm:gap-4 sm:p-4">
              <div className="text-sm">
                <span className="text-text-muted">Words: </span>
                <span className="font-medium text-white">
                  {transcript.length - silenceCount}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-text-muted">Fillers: </span>
                <span className="font-medium text-filler">{fillerCount}</span>
              </div>
              <div className="text-sm">
                <span className="text-text-muted">Silences: </span>
                <span className="font-medium text-filler">{silenceCount}</span>
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
              {/* Batch Operations */}
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
                  onClick={() => resetTranscript(DEMO_TRANSCRIPT)}
                  className="rounded-md bg-surface-lighter px-3 py-1 text-xs font-medium text-text-muted transition-colors hover:text-white"
                >
                  Reset Demo
                </button>
              </div>
            </div>

            {/* Timeline */}
            <Timeline
              transcript={transcript}
              duration={duration}
              currentTime={currentTime}
              onSeek={seekToTime}
            />

            {/* Subtitle Export (demo mode - no video export) */}
            <div className="mt-4">
              <p className="mb-2 text-xs text-text-muted">
                Export subtitles from the demo transcript:
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    downloadTextFile(
                      generateSrt(transcript),
                      "demo.srt",
                      "text/srt"
                    );
                    addToast("SRT file downloaded", "success");
                  }}
                  className="flex-1 rounded-lg border border-surface-lighter px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:border-primary hover:text-white"
                >
                  Export SRT
                </button>
                <button
                  onClick={() => {
                    downloadTextFile(
                      generateVtt(transcript),
                      "demo.vtt",
                      "text/vtt"
                    );
                    addToast("VTT file downloaded", "success");
                  }}
                  className="flex-1 rounded-lg border border-surface-lighter px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:border-primary hover:text-white"
                >
                  Export VTT
                </button>
                <button
                  onClick={() => {
                    downloadTextFile(
                      generatePlainText(transcript),
                      "demo.txt",
                      "text/plain"
                    );
                    addToast("Text file downloaded", "success");
                  }}
                  className="flex-1 rounded-lg border border-surface-lighter px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:border-primary hover:text-white"
                >
                  Export Text
                </button>
              </div>
              <p className="mt-2 text-xs text-text-muted/60">
                Video export is available when you sign up and upload your own
                videos.
              </p>
            </div>
          </div>

          {/* Transcript Panel */}
          <div className="rounded-lg border border-surface-lighter bg-surface-light">
            <div className="border-b border-surface-lighter px-4 py-3">
              <h2 className="font-semibold text-white">Transcript</h2>
              <p className="mt-1 text-xs text-text-muted">
                Click to seek. Double-click to delete/restore. Shift+click to
                select a range.
              </p>
            </div>
            <div className="max-h-[40vh] overflow-y-auto p-4 lg:max-h-[60vh]">
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
                      title={`${word.start.toFixed(1)}s - ${word.end.toFixed(1)}s${word.isFiller ? (isSilence ? " (silence)" : " (filler)") : ""}. Double-click to ${word.isDeleted ? "restore" : "delete"}.`}
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

              {/* Selection action bar */}
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
            </div>

            {/* Legend */}
            <div className="border-t border-surface-lighter px-4 py-3">
              <div className="flex flex-wrap gap-4 text-xs text-text-muted">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded bg-filler/30" />
                  Filler/Repetition
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
                for all keyboard shortcuts
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
