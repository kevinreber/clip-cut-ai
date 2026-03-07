import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useCallback, useEffect, useRef, useState } from "react";
import "../styles.css";

export const Route = createFileRoute("/project/$id")({
  component: ProjectEditor,
});

// Dummy transcript for UI testing (Phase 1)
const DUMMY_TRANSCRIPT = [
  { word: "So", start: 0.0, end: 0.3, isFiller: false, isDeleted: false },
  { word: "um", start: 0.3, end: 0.6, isFiller: true, isDeleted: false },
  { word: "today", start: 0.7, end: 1.1, isFiller: false, isDeleted: false },
  { word: "we're", start: 1.1, end: 1.3, isFiller: false, isDeleted: false },
  { word: "going", start: 1.3, end: 1.6, isFiller: false, isDeleted: false },
  { word: "to", start: 1.6, end: 1.7, isFiller: false, isDeleted: false },
  { word: "talk", start: 1.7, end: 2.0, isFiller: false, isDeleted: false },
  { word: "about", start: 2.0, end: 2.3, isFiller: false, isDeleted: false },
  { word: "uh", start: 2.4, end: 2.7, isFiller: true, isDeleted: false },
  { word: "video", start: 2.8, end: 3.2, isFiller: false, isDeleted: false },
  { word: "editing", start: 3.2, end: 3.7, isFiller: false, isDeleted: false },
  { word: "with", start: 3.8, end: 4.0, isFiller: false, isDeleted: false },
  { word: "AI", start: 4.0, end: 4.4, isFiller: false, isDeleted: false },
  { word: "um", start: 4.5, end: 4.8, isFiller: true, isDeleted: false },
  { word: "and", start: 4.9, end: 5.1, isFiller: false, isDeleted: false },
  { word: "how", start: 5.1, end: 5.3, isFiller: false, isDeleted: false },
  { word: "it", start: 5.3, end: 5.4, isFiller: false, isDeleted: false },
  { word: "can", start: 5.4, end: 5.6, isFiller: false, isDeleted: false },
  { word: "help", start: 5.6, end: 5.9, isFiller: false, isDeleted: false },
  { word: "you", start: 5.9, end: 6.1, isFiller: false, isDeleted: false },
  { word: "uh", start: 6.2, end: 6.5, isFiller: true, isDeleted: false },
  { word: "create", start: 6.6, end: 7.0, isFiller: false, isDeleted: false },
  { word: "better", start: 7.0, end: 7.3, isFiller: false, isDeleted: false },
  { word: "content", start: 7.3, end: 7.8, isFiller: false, isDeleted: false },
];

type TranscriptWord = (typeof DUMMY_TRANSCRIPT)[number];

function ProjectEditor() {
  const { id } = Route.useParams();
  const project = useQuery(api.projects.get, {
    id: id as Id<"projects">,
  });
  const videoUrl = useQuery(
    api.projects.getVideoUrl,
    project?.videoFileId ? { storageId: project.videoFileId } : "skip"
  );
  const updateTranscript = useMutation(api.projects.updateTranscript);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptWord[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize transcript from project or use dummy
  useEffect(() => {
    if (initialized) return;
    if (project) {
      setTranscript(
        project.transcript && project.transcript.length > 0
          ? project.transcript
          : DUMMY_TRANSCRIPT
      );
      setInitialized(true);
    }
  }, [project, initialized]);

  // Sync video time with transcript highlight
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [videoUrl]);

  const toggleWordDeleted = useCallback(
    (index: number) => {
      setTranscript((prev) => {
        const next = prev.map((w, i) =>
          i === index ? { ...w, isDeleted: !w.isDeleted } : w
        );
        // Persist to Convex
        updateTranscript({
          projectId: id as Id<"projects">,
          transcript: next,
        });
        return next;
      });
    },
    [id, updateTranscript]
  );

  const seekToWord = useCallback((word: TranscriptWord) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = word.start;
    }
  }, []);

  const deleteAllFillers = useCallback(() => {
    setTranscript((prev) => {
      const next = prev.map((w) =>
        w.isFiller ? { ...w, isDeleted: true } : w
      );
      updateTranscript({
        projectId: id as Id<"projects">,
        transcript: next,
      });
      return next;
    });
  }, [id, updateTranscript]);

  const restoreAll = useCallback(() => {
    setTranscript((prev) => {
      const next = prev.map((w) => ({ ...w, isDeleted: false }));
      updateTranscript({
        projectId: id as Id<"projects">,
        transcript: next,
      });
      return next;
    });
  }, [id, updateTranscript]);

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-text-muted">Loading project...</p>
      </div>
    );
  }

  const fillerCount = transcript.filter((w) => w.isFiller).length;
  const deletedCount = transcript.filter((w) => w.isDeleted).length;

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-surface-lighter px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <Link
            to="/"
            className="text-text-muted transition-colors hover:text-white"
          >
            &larr; Back
          </Link>
          <h1 className="truncate text-lg font-semibold text-white">
            {project.name}
          </h1>
          <span
            className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
              project.status === "ready"
                ? "bg-success/20 text-success"
                : project.status === "analyzing"
                  ? "bg-warning/20 text-warning"
                  : "bg-text-muted/20 text-text-muted"
            }`}
          >
            {project.status}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Video Player */}
          <div>
            <div className="overflow-hidden rounded-lg bg-black">
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="aspect-video w-full"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center text-text-muted">
                  <p>No video uploaded yet</p>
                </div>
              )}
            </div>

            {/* Stats Bar */}
            <div className="mt-4 flex flex-wrap gap-4 rounded-lg bg-surface-light p-4">
              <div className="text-sm">
                <span className="text-text-muted">Words: </span>
                <span className="font-medium text-white">
                  {transcript.length}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-text-muted">Fillers: </span>
                <span className="font-medium text-filler">{fillerCount}</span>
              </div>
              <div className="text-sm">
                <span className="text-text-muted">Deleted: </span>
                <span className="font-medium text-deleted">{deletedCount}</span>
              </div>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={deleteAllFillers}
                  className="rounded-md bg-warning/20 px-3 py-1 text-sm font-medium text-warning transition-colors hover:bg-warning/30"
                >
                  Remove All Fillers
                </button>
                <button
                  onClick={restoreAll}
                  className="rounded-md bg-surface-lighter px-3 py-1 text-sm font-medium text-text-muted transition-colors hover:text-white"
                >
                  Restore All
                </button>
              </div>
            </div>
          </div>

          {/* Transcript Panel */}
          <div className="rounded-lg border border-surface-lighter bg-surface-light">
            <div className="border-b border-surface-lighter px-4 py-3">
              <h2 className="font-semibold text-white">Transcript</h2>
              <p className="mt-1 text-xs text-text-muted">
                Click a word to delete/restore it. Filler words are highlighted.
              </p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              <div className="flex flex-wrap gap-1">
                {transcript.map((word, index) => {
                  const isActive =
                    currentTime >= word.start && currentTime < word.end;
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        if (word.isDeleted) {
                          toggleWordDeleted(index);
                        } else {
                          seekToWord(word);
                        }
                      }}
                      onDoubleClick={() => toggleWordDeleted(index)}
                      title={`${word.start.toFixed(1)}s - ${word.end.toFixed(1)}s${word.isFiller ? " (filler)" : ""}. Double-click to ${word.isDeleted ? "restore" : "delete"}.`}
                      className={`inline-block rounded px-1.5 py-0.5 text-sm transition-all ${
                        word.isDeleted
                          ? "bg-deleted/10 text-deleted line-through opacity-50"
                          : word.isFiller
                            ? "bg-filler/20 text-filler hover:bg-filler/30"
                            : "text-text hover:bg-surface-lighter"
                      } ${isActive ? "ring-2 ring-primary" : ""}`}
                    >
                      {word.word}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="border-t border-surface-lighter px-4 py-3">
              <div className="flex flex-wrap gap-4 text-xs text-text-muted">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded bg-filler/30" />
                  Filler word
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
