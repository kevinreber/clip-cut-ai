import { createFileRoute, Link } from "@tanstack/react-router";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useCallback, useEffect, useRef, useState } from "react";
import "../styles.css";
import { Timeline } from "../components/Timeline";
import { ExportButton } from "../components/ExportButton";
import { getCachedVideo, cacheVideo } from "../lib/video-cache";
import { AuthForm } from "../components/AuthForm";
import { UserMenu } from "../components/UserMenu";

export const Route = createFileRoute("/project/$id")({
  component: ProjectEditor,
});

type TranscriptWord = {
  word: string;
  start: number;
  end: number;
  isFiller: boolean;
  isDeleted: boolean;
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptWord[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [cachedVideoUrl, setCachedVideoUrl] = useState<string | null>(null);

  // Initialize transcript from project data
  useEffect(() => {
    if (initialized) return;
    if (project) {
      setTranscript(
        project.transcript && project.transcript.length > 0
          ? project.transcript
          : []
      );
      setInitialized(true);
    }
  }, [project, initialized]);

  // Update local transcript when project transcript changes (e.g. after analysis)
  useEffect(() => {
    if (project?.transcript && project.transcript.length > 0) {
      setTranscript(project.transcript);
    }
  }, [project?.transcript]);

  // Local-first video caching
  useEffect(() => {
    if (!project?.videoFileId || !videoUrl) return;
    const storageId = project.videoFileId;
    let revoked = false;

    (async () => {
      const cached = await getCachedVideo(storageId);
      if (cached) {
        const url = URL.createObjectURL(cached);
        setCachedVideoUrl(url);
        return;
      }
      // Fetch and cache for next time
      try {
        const resp = await fetch(videoUrl);
        const blob = await resp.blob();
        await cacheVideo(storageId, blob);
        if (!revoked) {
          const url = URL.createObjectURL(blob);
          setCachedVideoUrl(url);
        }
      } catch {
        // Fall back to remote URL
      }
    })();

    return () => {
      revoked = true;
      if (cachedVideoUrl) URL.revokeObjectURL(cachedVideoUrl);
    };
  }, [project?.videoFileId, videoUrl]);

  const effectiveVideoUrl = cachedVideoUrl || videoUrl;

  // Sync video time with transcript highlight
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onLoadedMetadata = () => setDuration(video.duration);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    if (video.duration) setDuration(video.duration);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [effectiveVideoUrl]);

  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      await analyzeVideo({ projectId: id as Id<"projects"> });
    } catch (err: any) {
      const message =
        err instanceof ConvexError
          ? (err.data as string)
          : err.message || "Analysis failed. Please try again.";
      setAnalyzeError(message);
    } finally {
      setAnalyzing(false);
    }
  }, [id, analyzeVideo]);

  const toggleWordDeleted = useCallback(
    (index: number) => {
      setTranscript((prev) => {
        const next = prev.map((w, i) =>
          i === index ? { ...w, isDeleted: !w.isDeleted } : w
        );
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

  const seekToTime = useCallback((time: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
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
  const silenceCount = transcript.filter(
    (w) => w.word.startsWith("[silence")
  ).length;
  const isAnalyzing = analyzing || project.status === "analyzing";
  const hasTranscript = transcript.length > 0;

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
          <div className="ml-auto">
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
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

            {/* Stats Bar */}
            <div className="mt-4 flex flex-wrap gap-4 rounded-lg bg-surface-light p-4">
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
                      {fillerCount - silenceCount}
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
                </>
              ) : (
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm text-text-muted">
                    {isAnalyzing
                      ? "AI is analyzing your video..."
                      : "No transcript yet. Analyze your video to get started."}
                  </span>
                  {!isAnalyzing && effectiveVideoUrl && (
                    <button
                      onClick={handleAnalyze}
                      className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/80"
                    >
                      Analyze Video
                    </button>
                  )}
                </div>
              )}
            </div>

            {analyzeError && (
              <div className="mt-3 rounded-lg bg-danger/10 border border-danger/20 p-3 text-sm text-danger">
                {analyzeError}
              </div>
            )}

            {/* Timeline */}
            {hasTranscript && duration > 0 && (
              <Timeline
                transcript={transcript}
                duration={duration}
                currentTime={currentTime}
                onSeek={seekToTime}
              />
            )}

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
              <h2 className="font-semibold text-white">Transcript</h2>
              <p className="mt-1 text-xs text-text-muted">
                {hasTranscript
                  ? "Click a word to seek. Double-click to delete/restore. Fillers & silences are highlighted."
                  : "Analyze your video to generate a transcript."}
              </p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
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
                <div className="flex flex-wrap gap-1">
                  {transcript.map((word, index) => {
                    const isActive =
                      currentTime >= word.start && currentTime < word.end;
                    const isSilence = word.word.startsWith("[silence");
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
                        title={`${word.start.toFixed(1)}s - ${word.end.toFixed(1)}s${word.isFiller ? (isSilence ? " (silence)" : " (filler)") : ""}. Double-click to ${word.isDeleted ? "restore" : "delete"}.`}
                        className={`inline-block rounded px-1.5 py-0.5 text-sm transition-all ${
                          word.isDeleted
                            ? "bg-deleted/10 text-deleted line-through opacity-50"
                            : isSilence
                              ? "bg-warning/10 text-warning/70 italic text-xs"
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
                  Filler word
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
