import { createFileRoute, Link } from "@tanstack/react-router";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles.css";
import { Timeline } from "../components/Timeline";
import { ExportButton } from "../components/ExportButton";
import { EditingStats } from "../components/EditingStats";
import { FillerWordChart } from "../components/FillerWordChart";
import { CustomFillerWords } from "../components/CustomFillerWords";
import { LanguageSelect } from "../components/LanguageSelect";
import { computeKeptSegments } from "../lib/video-export";
import { useUndoRedo } from "../lib/use-undo-redo";
import { useVideoPlayer } from "../lib/use-video-player";
import { useVideoCache } from "../lib/use-video-cache";
import { AuthForm } from "../components/AuthForm";
import { UserMenu } from "../components/UserMenu";
import { useToast } from "../components/Toast";

export const Route = createFileRoute("/project/$id")({
  component: ProjectEditor,
});

type TranscriptWord = {
  word: string;
  start: number;
  end: number;
  isFiller: boolean;
  isDeleted: boolean;
  confidence?: number;
};

function ProjectEditor() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  return <ProjectEditorContent />;
}

function ProjectEditorContent() {
  const { id } = Route.useParams();
  const project = useQuery(api.projects.get, {
    id: id as Id<"projects">,
  });
  const videoUrl = useQuery(
    api.projects.getVideoUrl,
    project?.videoFileId ? { storageId: project.videoFileId } : "skip"
  );
  const updateTranscript = useMutation(api.projects.updateTranscript);
  const analyzeVideo = useAction(api.analyze.analyzeVideo);
  const renameProject = useMutation(api.projects.renameProject);
  const duplicateProject = useMutation(api.projects.duplicateProject);
  const updateLanguage = useMutation(api.projects.updateLanguage);
  const updateCustomFillerWords = useMutation(api.projects.updateCustomFillerWords);
  const updateSilenceThreshold = useMutation(api.projects.updateSilenceThreshold);

  const effectiveVideoUrl = useVideoCache(project?.videoFileId, videoUrl);
  const {
    videoRef,
    currentTime,
    duration,
    isPlaying,
    seekTo: seekToTime,
    togglePlayPause,
    seekRelative,
    playbackRate,
    setPlaybackRate,
    volume,
    setVolume,
  } = useVideoPlayer(effectiveVideoUrl);

  const {
    state: transcript,
    set: setTranscript,
    undo: undoTranscript,
    redo: redoTranscript,
    reset: resetTranscript,
    canUndo,
    canRedo,
  } = useUndoRedo<TranscriptWord[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showConfidence, setShowConfidence] = useState(false);
  const [language, setLanguage] = useState("");
  const [customFillerWords, setCustomFillerWords] = useState<string[]>([]);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [silenceThreshold, setSilenceThreshold] = useState(2.0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchIndices, setSearchMatchIndices] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
  const [targetSilenceDuration, setTargetSilenceDuration] = useState(0.5);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedTranscriptRef = useRef<string>("");
  const lastClickedIndex = useRef<number | null>(null);
  const { addToast } = useToast();

  // Initialize transcript from project data
  useEffect(() => {
    if (initialized) return;
    if (project) {
      resetTranscript(
        project.transcript && project.transcript.length > 0
          ? project.transcript
          : []
      );
      setLanguage(project.language || "");
      setCustomFillerWords(project.customFillerWords || []);
      setSilenceThreshold(project.silenceThreshold ?? 2.0);
      setInitialized(true);
    }
  }, [project, initialized]);

  // Update local transcript when project transcript changes (e.g. after analysis)
  useEffect(() => {
    if (project?.transcript && project.transcript.length > 0) {
      resetTranscript(project.transcript);
    }
  }, [project?.transcript]);

  // Compute search matches
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchMatchIndices([]);
      return;
    }
    const query = searchQuery.toLowerCase().trim();
    const matches: number[] = [];
    for (let i = 0; i < transcript.length; i++) {
      if (transcript[i].word.toLowerCase().includes(query)) {
        matches.push(i);
      }
    }
    setSearchMatchIndices(matches);
  }, [searchQuery, transcript]);

  // Reset current search index when matches change
  useEffect(() => {
    setCurrentSearchIndex(0);
  }, [searchMatchIndices.length]);

  const selectSearchMatches = useCallback(() => {
    if (searchMatchIndices.length === 0) return;
    setSelection(new Set(searchMatchIndices));
    addToast(`${searchMatchIndices.length} matches selected`, "info");
  }, [searchMatchIndices, addToast]);

  const deleteSearchMatches = useCallback(() => {
    if (searchMatchIndices.length === 0) return;
    const matchSet = new Set(searchMatchIndices);
    setTranscript((prev) =>
      prev.map((w, i) => (matchSet.has(i) ? { ...w, isDeleted: true } : w))
    );
    addToast(`${searchMatchIndices.length} matches deleted`, "success");
  }, [searchMatchIndices, setTranscript, addToast]);

  const restoreSearchMatches = useCallback(() => {
    if (searchMatchIndices.length === 0) return;
    const matchSet = new Set(searchMatchIndices);
    setTranscript((prev) =>
      prev.map((w, i) => (matchSet.has(i) ? { ...w, isDeleted: false } : w))
    );
    addToast(`${searchMatchIndices.length} matches restored`, "info");
  }, [searchMatchIndices, setTranscript, addToast]);

  const navigateSearchMatch = useCallback(
    (direction: "next" | "prev") => {
      if (searchMatchIndices.length === 0) return;
      let newIndex = currentSearchIndex;
      if (direction === "next") {
        newIndex = (currentSearchIndex + 1) % searchMatchIndices.length;
      } else {
        newIndex = (currentSearchIndex - 1 + searchMatchIndices.length) % searchMatchIndices.length;
      }
      setCurrentSearchIndex(newIndex);
      const wordIndex = searchMatchIndices[newIndex];
      const word = transcript[wordIndex];
      if (word) seekToTime(word.start);
    },
    [searchMatchIndices, currentSearchIndex, transcript, seekToTime]
  );

  const deleteLowConfidence = useCallback(() => {
    let count = 0;
    setTranscript((prev) =>
      prev.map((w) => {
        if (
          w.confidence !== undefined &&
          w.confidence < confidenceThreshold &&
          !w.word.startsWith("[silence") &&
          !w.isDeleted
        ) {
          count++;
          return { ...w, isDeleted: true };
        }
        return w;
      })
    );
    addToast(`${count} low-confidence words deleted`, "success");
  }, [confidenceThreshold, setTranscript, addToast]);

  const shortenAllSilences = useCallback(() => {
    let count = 0;
    setTranscript((prev) =>
      prev.map((w) => {
        if (w.word.startsWith("[silence") && !w.isDeleted) {
          const originalDuration = w.end - w.start;
          if (originalDuration > targetSilenceDuration) {
            count++;
            const newEnd = w.start + targetSilenceDuration;
            return {
              ...w,
              end: newEnd,
              word: `[silence ${targetSilenceDuration.toFixed(1)}s]`,
            };
          }
        }
        return w;
      })
    );
    addToast(
      count > 0
        ? `${count} silence${count > 1 ? "s" : ""} shortened to ${targetSilenceDuration.toFixed(1)}s`
        : "No silences to shorten",
      count > 0 ? "success" : "info"
    );
  }, [targetSilenceDuration, setTranscript, addToast]);

  // Compute kept segments for preview mode
  const keptSegments = useMemo(
    () => (transcript.length > 0 && duration > 0 ? computeKeptSegments(transcript, duration) : []),
    [transcript, duration]
  );

  // Preview mode: skip deleted segments during playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !previewMode || keptSegments.length === 0) return;

    const onTimeUpdate = () => {
      const t = video.currentTime;
      const currentSeg = keptSegments.find((s) => t >= s.start - 0.05 && t < s.end);
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

  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      await analyzeVideo({
        projectId: id as Id<"projects">,
        language: language || undefined,
        customFillerWords: customFillerWords.length > 0 ? customFillerWords : undefined,
        silenceThreshold: silenceThreshold !== 2.0 ? silenceThreshold : undefined,
      });
    } catch (err: any) {
      const message =
        err instanceof ConvexError
          ? (err.data as string)
          : err.message || "Analysis failed. Please try again.";
      setAnalyzeError(message);
    } finally {
      setAnalyzing(false);
    }
  }, [id, analyzeVideo, language, customFillerWords, silenceThreshold]);

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
  }, [setTranscript]);

  const deleteAllSilences = useCallback(() => {
    setTranscript((prev) =>
      prev.map((w) => (w.word.startsWith("[silence") ? { ...w, isDeleted: true } : w))
    );
  }, [setTranscript]);

  const restoreAll = useCallback(() => {
    setTranscript((prev) => prev.map((w) => ({ ...w, isDeleted: false })));
  }, [setTranscript]);

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

  // Timeline drag-to-select: select words within the time range
  const handleTimelineSelect = useCallback(
    (start: number, end: number) => {
      const newSelection = new Set<number>();
      for (let i = 0; i < transcript.length; i++) {
        const w = transcript[i];
        if (w.start >= start && w.end <= end) {
          newSelection.add(i);
        }
      }
      if (newSelection.size > 0) {
        setSelection(newSelection);
        addToast(`${newSelection.size} words selected from timeline`, "info");
      }
    },
    [transcript, addToast]
  );

  // Sync undo/redo changes back to Convex
  const syncTranscript = useCallback(
    (t: TranscriptWord[]) => {
      updateTranscript({ projectId: id as Id<"projects">, transcript: t });
    },
    [id, updateTranscript]
  );

  const handleUndo = useCallback(() => {
    undoTranscript();
  }, [undoTranscript]);

  const handleRedo = useCallback(() => {
    redoTranscript();
  }, [redoTranscript]);

  // Persist after undo/redo with save status
  const prevTranscriptRef = useRef(transcript);
  useEffect(() => {
    if (prevTranscriptRef.current !== transcript && initialized && transcript.length > 0) {
      setSaveStatus("saving");
      syncTranscript(transcript);
      const hash = JSON.stringify(transcript.map((w) => w.isDeleted));
      lastSavedTranscriptRef.current = hash;
      // Brief delay to show "saving" state
      const timer = setTimeout(() => setSaveStatus("saved"), 500);
      return () => clearTimeout(timer);
    }
    prevTranscriptRef.current = transcript;
  }, [transcript, initialized, syncTranscript]);

  // Auto-save timer: sync every 30 seconds as safety net
  useEffect(() => {
    if (!initialized || transcript.length === 0) return;
    autoSaveTimerRef.current = setInterval(() => {
      const hash = JSON.stringify(transcript.map((w) => w.isDeleted));
      if (hash !== lastSavedTranscriptRef.current) {
        setSaveStatus("saving");
        syncTranscript(transcript);
        lastSavedTranscriptRef.current = hash;
        setTimeout(() => setSaveStatus("saved"), 500);
      }
    }, 30000);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [initialized, transcript, syncTranscript]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

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
          if (!e.metaKey && !e.ctrlKey) {
            setPreviewMode((p) => !p);
          }
          break;
        case "ArrowLeft":
          seekRelative(-5);
          break;
        case "ArrowRight":
          seekRelative(5);
          break;
        case "j":
          if (!e.metaKey && !e.ctrlKey) {
            seekRelative(-10);
          }
          break;
        case "k":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            togglePlayPause();
          }
          break;
        case "l":
          if (!e.metaKey && !e.ctrlKey) {
            seekRelative(10);
          }
          break;
        case ",":
          // Previous word
          if (transcript.length > 0) {
            const prevWord = transcript.filter((w) => w.end <= currentTime).pop();
            if (prevWord) seekToTime(prevWord.start);
          }
          break;
        case ".":
          // Next word
          if (transcript.length > 0) {
            const nextWord = transcript.find((w) => w.start > currentTime);
            if (nextWord) seekToTime(nextWord.start);
          }
          break;
        case "0":
          if (!e.metaKey && !e.ctrlKey) seekToTime(0);
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
          if (!e.metaKey && !e.ctrlKey) {
            setVolume(volume === 0 ? 1 : 0);
          }
          break;
        case "/":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            const searchInput = document.querySelector('[data-testid="transcript-search"]') as HTMLInputElement;
            if (searchInput) searchInput.focus();
          }
          break;
        case "F3":
          e.preventDefault();
          if (e.shiftKey) navigateSearchMatch("prev");
          else navigateSearchMatch("next");
          break;
        case "f":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const si = document.querySelector('[data-testid="transcript-search"]') as HTMLInputElement;
            if (si) si.focus();
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, togglePlayPause, seekRelative, seekToTime, playbackRate, volume, setPlaybackRate, setVolume, transcript, currentTime, navigateSearchMatch]);

  // Unsaved changes warning
  const hasUnsavedChanges = canUndo;
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const handleDuplicate = useCallback(async () => {
    try {
      await duplicateProject({ id: project!._id });
      addToast("Project duplicated!", "success");
    } catch {
      addToast("Failed to duplicate project.", "error");
    }
  }, [duplicateProject, project, addToast]);

  const handleLanguageChange = useCallback(
    (lang: string) => {
      setLanguage(lang);
      if (project) {
        updateLanguage({ projectId: project._id, language: lang });
      }
    },
    [project, updateLanguage]
  );

  const handleSilenceThresholdChange = useCallback(
    (value: number) => {
      setSilenceThreshold(value);
      if (project) {
        updateSilenceThreshold({ projectId: project._id, silenceThreshold: value });
      }
    },
    [project, updateSilenceThreshold]
  );

  const handleCustomFillerWordsUpdate = useCallback(
    (words: string[]) => {
      setCustomFillerWords(words);
      if (project) {
        updateCustomFillerWords({ projectId: project._id, customFillerWords: words });
      }
    },
    [project, updateCustomFillerWords]
  );

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-text-muted">Loading project...</p>
      </div>
    );
  }

  const fillerCount = transcript.filter((w) => w.isFiller && !w.word.startsWith("[silence")).length;
  const deletedCount = transcript.filter((w) => w.isDeleted).length;
  const silenceCount = transcript.filter(
    (w) => w.word.startsWith("[silence")
  ).length;
  const isAnalyzing = analyzing || project.status === "analyzing";
  const hasTranscript = transcript.length > 0;

  const beforeText = transcript
    .filter((w) => !w.word.startsWith("[silence"))
    .map((w) => w.word)
    .join(" ");
  const afterText = transcript
    .filter((w) => !w.isDeleted && !w.word.startsWith("[silence"))
    .map((w) => w.word)
    .join(" ");

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-surface-lighter px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-2 sm:gap-4">
          <Link
            to="/"
            className="shrink-0 text-text-muted transition-colors hover:text-white"
          >
            &larr; <span className="hidden sm:inline">Back</span>
          </Link>
          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => {
                const trimmed = renameValue.trim();
                if (trimmed && trimmed !== project.name) {
                  renameProject({ id: project._id, name: trimmed });
                }
                setIsRenaming(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setIsRenaming(false);
              }}
              className="min-w-0 rounded border border-primary bg-surface px-2 py-0.5 text-base font-semibold text-white outline-none sm:text-lg"
            />
          ) : (
            <h1
              className="min-w-0 cursor-pointer truncate text-base font-semibold text-white sm:text-lg"
              onDoubleClick={() => {
                setRenameValue(project.name);
                setIsRenaming(true);
              }}
              title="Double-click to rename"
            >
              {project.name}
            </h1>
          )}
          <span
            className={`ml-1 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium sm:ml-2 ${
              project.status === "ready"
                ? "bg-success/20 text-success"
                : project.status === "analyzing"
                  ? "bg-warning/20 text-warning"
                  : "bg-text-muted/20 text-text-muted"
            }`}
          >
            {project.status}
          </span>
          {hasTranscript && (
            <span
              className={`shrink-0 text-[10px] transition-opacity ${
                saveStatus === "saving"
                  ? "text-warning animate-pulse"
                  : saveStatus === "unsaved"
                    ? "text-warning"
                    : "text-text-muted/40"
              }`}
              data-testid="save-status"
              title={saveStatus === "saving" ? "Saving..." : saveStatus === "unsaved" ? "Unsaved changes" : "All changes saved"}
            >
              {saveStatus === "saving" ? "Saving..." : saveStatus === "unsaved" ? "Unsaved" : "Saved"}
            </span>
          )}
          <button
            onClick={handleDuplicate}
            className="shrink-0 rounded-md bg-surface-lighter px-2 py-1 text-xs text-text-muted transition-colors hover:text-white"
            title="Duplicate project"
            data-testid="duplicate-btn"
          >
            Duplicate
          </button>
          <div className="ml-auto hidden sm:block">
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_400px]">
          {/* Video Player */}
          <div>
            <div className="overflow-hidden rounded-lg bg-black">
              {effectiveVideoUrl ? (
                <video
                  ref={videoRef}
                  src={effectiveVideoUrl}
                  controls
                  className="aspect-video w-full"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center text-text-muted">
                  <p>No video uploaded yet</p>
                </div>
              )}
            </div>

            {/* Playback Controls */}
            {effectiveVideoUrl && (
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
                    {volume === 0 ? "&#128263;" : volume < 0.5 ? "&#128264;" : "&#128266;"}
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
            )}

            {/* Stats & Actions Bar */}
            <div className="mt-2 flex flex-wrap gap-3 rounded-lg bg-surface-light p-3 sm:gap-4 sm:p-4">
              {hasTranscript ? (
                <>
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
                      className="rounded-md bg-surface-lighter px-2.5 py-1 text-sm font-medium text-text-muted transition-colors hover:text-white disabled:opacity-30"
                      title="Undo (Ctrl+Z)"
                    >
                      &#8630;
                    </button>
                    <button
                      onClick={handleRedo}
                      disabled={!canRedo}
                      className="rounded-md bg-surface-lighter px-2.5 py-1 text-sm font-medium text-text-muted transition-colors hover:text-white disabled:opacity-30"
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
                    <button
                      onClick={() => setShowBeforeAfter((s) => !s)}
                      className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                        showBeforeAfter
                          ? "bg-primary text-white"
                          : "bg-surface-lighter text-text-muted hover:text-white"
                      }`}
                      title="Compare before and after"
                      data-testid="before-after-btn"
                    >
                      Compare
                    </button>
                  </div>
                  {/* Batch Operations */}
                  <div className="flex w-full flex-wrap gap-2 border-t border-surface-lighter pt-2">
                    <span className="text-xs text-text-muted self-center">Quick actions:</span>
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
                  </div>

                  {/* Smart Silence Shortener */}
                  {silenceCount > 0 && (
                    <div className="flex w-full items-center gap-3 border-t border-surface-lighter pt-2" data-testid="silence-shortener">
                      <span className="text-xs text-text-muted whitespace-nowrap">Shorten silences to:</span>
                      <input
                        type="range"
                        min="0.1"
                        max="2.0"
                        step="0.1"
                        value={targetSilenceDuration}
                        onChange={(e) => setTargetSilenceDuration(parseFloat(e.target.value))}
                        className="w-24 accent-primary"
                      />
                      <span className="text-xs font-medium text-white tabular-nums w-8">
                        {targetSilenceDuration.toFixed(1)}s
                      </span>
                      <button
                        onClick={shortenAllSilences}
                        className="rounded-md bg-primary/20 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/30"
                        data-testid="shorten-silences-btn"
                      >
                        Shorten Silences
                      </button>
                    </div>
                  )}

                  {/* Confidence-Based Auto-Delete */}
                  {showConfidence && (
                    <div className="flex w-full items-center gap-3 border-t border-surface-lighter pt-2" data-testid="confidence-threshold">
                      <span className="text-xs text-text-muted whitespace-nowrap">Confidence threshold:</span>
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.05"
                        value={confidenceThreshold}
                        onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                        className="w-24 accent-primary"
                      />
                      <span className="text-xs font-medium text-white tabular-nums w-8">
                        {(confidenceThreshold * 100).toFixed(0)}%
                      </span>
                      <button
                        onClick={deleteLowConfidence}
                        className="rounded-md bg-danger/20 px-3 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/30"
                        data-testid="delete-low-confidence-btn"
                      >
                        Delete Below {(confidenceThreshold * 100).toFixed(0)}%
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="text-sm text-text-muted">
                    {isAnalyzing
                      ? "AI is analyzing your video..."
                      : "No transcript yet. Analyze your video to get started."}
                  </span>
                  {!isAnalyzing && effectiveVideoUrl && (
                    <div className="flex items-center gap-3">
                      <LanguageSelect value={language} onChange={handleLanguageChange} />
                      <button
                        onClick={handleAnalyze}
                        className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/80"
                      >
                        Analyze Video
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {analyzeError && (
              <div className="mt-3 rounded-lg bg-danger/10 border border-danger/20 p-3 text-sm text-danger">
                {analyzeError}
              </div>
            )}

            {/* Before/After Comparison */}
            {showBeforeAfter && hasTranscript && (
              <div className="mt-3 grid grid-cols-2 gap-3" data-testid="before-after-panel">
                <div className="rounded-lg border border-surface-lighter bg-surface-light p-3">
                  <h4 className="mb-2 text-xs font-medium text-text-muted">Before</h4>
                  <p className="text-sm text-text leading-relaxed">{beforeText}</p>
                </div>
                <div className="rounded-lg border border-success/20 bg-success/5 p-3">
                  <h4 className="mb-2 text-xs font-medium text-success">After</h4>
                  <p className="text-sm text-text leading-relaxed">{afterText}</p>
                </div>
              </div>
            )}

            {/* Editing Stats Summary */}
            {hasTranscript && duration > 0 && (
              <EditingStats transcript={transcript} duration={duration} />
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

            {/* Filler Word Frequency Chart */}
            {hasTranscript && <FillerWordChart transcript={transcript} />}

            {/* Export */}
            {hasTranscript && effectiveVideoUrl && duration > 0 && (
              <ExportButton
                videoUrl={effectiveVideoUrl}
                transcript={transcript}
                videoDuration={duration}
                projectName={project.name}
              />
            )}
          </div>

          {/* Transcript Panel */}
          <div className="rounded-lg border border-surface-lighter bg-surface-light">
            <div className="border-b border-surface-lighter px-4 py-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-white">Transcript</h2>
                {hasTranscript && (
                  <button
                    onClick={() => setShowConfidence((s) => !s)}
                    className={`rounded-md px-2 py-0.5 text-xs transition-colors ${
                      showConfidence
                        ? "bg-primary text-white"
                        : "bg-surface-lighter text-text-muted hover:text-white"
                    }`}
                    title="Toggle confidence scores"
                    data-testid="confidence-toggle"
                  >
                    Confidence
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-text-muted">
                {hasTranscript
                  ? "Click to seek. Double-click to delete/restore. Shift+click to select a range."
                  : "Analyze your video to generate a transcript."}
              </p>
              {hasTranscript && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search transcript..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-md border border-surface-lighter bg-surface px-3 py-1.5 pr-8 text-xs text-white placeholder-text-muted/50 outline-none focus:border-primary"
                      data-testid="transcript-search"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-white text-xs"
                      >
                        &#10005;
                      </button>
                    )}
                  </div>
                  {searchMatchIndices.length > 0 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigateSearchMatch("prev")}
                        className="rounded bg-surface-lighter px-1.5 py-0.5 text-[10px] text-text-muted hover:text-white"
                        title="Previous match (Shift+F3)"
                      >
                        &#9650;
                      </button>
                      <span className="text-[10px] text-text-muted tabular-nums whitespace-nowrap">
                        {currentSearchIndex + 1}/{searchMatchIndices.length}
                      </span>
                      <button
                        onClick={() => navigateSearchMatch("next")}
                        className="rounded bg-surface-lighter px-1.5 py-0.5 text-[10px] text-text-muted hover:text-white"
                        title="Next match (F3)"
                      >
                        &#9660;
                      </button>
                      <button
                        onClick={selectSearchMatches}
                        className="rounded-md bg-primary/20 px-2 py-1 text-[10px] font-medium text-primary transition-colors hover:bg-primary/30 whitespace-nowrap"
                        title="Select all matching words"
                        data-testid="search-select-all"
                      >
                        Select
                      </button>
                      <button
                        onClick={deleteSearchMatches}
                        className="rounded-md bg-danger/20 px-2 py-1 text-[10px] font-medium text-danger transition-colors hover:bg-danger/30 whitespace-nowrap"
                        title="Delete all matching words"
                        data-testid="search-delete-all"
                      >
                        Delete
                      </button>
                      <button
                        onClick={restoreSearchMatches}
                        className="rounded-md bg-success/20 px-2 py-1 text-[10px] font-medium text-success transition-colors hover:bg-success/30 whitespace-nowrap"
                        title="Restore all matching words"
                        data-testid="search-restore-all"
                      >
                        Restore
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Custom Filler Words & Silence Threshold */}
            {!hasTranscript && effectiveVideoUrl && !isAnalyzing && (
              <div className="border-b border-surface-lighter px-4 py-3 space-y-3">
                <CustomFillerWords
                  customWords={customFillerWords}
                  onUpdate={handleCustomFillerWordsUpdate}
                />
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-text-muted">
                      Silence threshold
                    </label>
                    <span className="text-xs font-medium text-white tabular-nums">
                      {silenceThreshold.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.5"
                    value={silenceThreshold}
                    onChange={(e) => handleSilenceThresholdChange(parseFloat(e.target.value))}
                    className="mt-1 w-full accent-primary"
                    data-testid="silence-threshold-slider"
                  />
                  <div className="mt-0.5 flex justify-between text-[10px] text-text-muted/50">
                    <span>0.5s</span>
                    <span>5s</span>
                  </div>
                </div>
              </div>
            )}

            <div className="max-h-[40vh] overflow-y-auto p-4 lg:max-h-[60vh]">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 text-4xl animate-spin">&#9881;</div>
                  <p className="text-sm font-medium text-white">
                    Analyzing video with AI...
                  </p>
                  <p className="mt-2 text-xs text-text-muted">
                    Extracting audio and generating word-level timestamps.
                    <br />
                    This may take a minute depending on video length.
                  </p>
                </div>
              ) : hasTranscript ? (
                <>
                  <div className="flex flex-wrap gap-1">
                    {transcript.map((word, index) => {
                      const isActive =
                        currentTime >= word.start && currentTime < word.end;
                      const isSilence = word.word.startsWith("[silence");
                      const isSelected = selection.has(index);
                      const lowConfidence =
                        showConfidence &&
                        word.confidence !== undefined &&
                        word.confidence < 0.7;
                      const isSearchMatch = searchMatchIndices.includes(index);
                      const isCurrentSearchMatch = searchMatchIndices.length > 0 && searchMatchIndices[currentSearchIndex] === index;
                      return (
                        <button
                          key={index}
                          onClick={(e) => handleWordClick(index, e)}
                          onDoubleClick={() => toggleWordDeleted(index)}
                          title={`${word.start.toFixed(1)}s - ${word.end.toFixed(1)}s${word.isFiller ? (isSilence ? " (silence)" : " (filler)") : ""}${word.confidence !== undefined ? ` | confidence: ${(word.confidence * 100).toFixed(0)}%` : ""}. Double-click to ${word.isDeleted ? "restore" : "delete"}. Shift+click to select range.`}
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
                          } ${isActive && !isSelected ? "ring-2 ring-primary" : ""} ${isCurrentSearchMatch && !isSelected ? "ring-2 ring-warning bg-warning/20" : isSearchMatch && !isSelected ? "ring-1 ring-warning bg-warning/10" : ""} ${lowConfidence ? "border-b-2 border-dashed border-danger/50" : ""}`}
                        >
                          {word.word}
                          {showConfidence && word.confidence !== undefined && (
                            <span className="ml-0.5 text-[10px] text-text-muted/50">
                              {(word.confidence * 100).toFixed(0)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selection action bar */}
                  {selection.size > 0 && (
                    <div className="sticky bottom-0 mt-2 flex items-center gap-2 rounded-lg bg-surface border border-surface-lighter p-2">
                      <span className="text-xs text-text-muted">
                        {selection.size} word{selection.size > 1 ? "s" : ""} selected
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
                  <div className="mb-4 text-4xl">&#127908;</div>
                  <p className="text-sm text-text-muted">
                    No transcript yet.
                  </p>
                  {effectiveVideoUrl && (
                    <button
                      onClick={handleAnalyze}
                      className="mt-4 rounded-md bg-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/80"
                    >
                      Analyze Video with AI
                    </button>
                  )}
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
                {showConfidence && (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded border-b-2 border-dashed border-danger/50" />
                    Low confidence
                  </div>
                )}
              </div>
              <div className="mt-2 hidden text-xs text-text-muted/60 sm:block">
                Press <kbd className="rounded bg-surface-lighter px-1 py-0.5">?</kbd> for all keyboard shortcuts
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
            className="w-full max-w-md rounded-xl bg-surface-light border border-surface-lighter p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-text-muted hover:text-white text-xl"
              >
                &times;
              </button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ["Space / K", "Play / Pause"],
                ["P", "Toggle preview mode"],
                ["\u2190 / \u2192", "Seek back / forward 5s"],
                ["J / L", "Seek back / forward 10s"],
                [", / .", "Previous / Next word"],
                ["0", "Jump to start"],
                ["[ / ]", "Slow down / Speed up playback"],
                ["M", "Mute / Unmute"],
                ["/", "Focus search"],
                ["Ctrl+F", "Focus search"],
                ["F3 / Shift+F3", "Next / Previous search match"],
                ["Ctrl+Z", "Undo"],
                ["Ctrl+Shift+Z", "Redo"],
                ["Shift+Click", "Select word range"],
                ["Double-click", "Delete / Restore word"],
                ["?", "Toggle this help"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between">
                  <kbd className="rounded bg-surface px-2 py-1 text-xs font-mono text-white border border-surface-lighter">
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
