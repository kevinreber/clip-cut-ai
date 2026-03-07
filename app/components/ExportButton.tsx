import { useState, useCallback } from "react";
import { exportVideo, type ExportProgress } from "../lib/video-export";

type TranscriptWord = {
  word: string;
  start: number;
  end: number;
  isFiller: boolean;
  isDeleted: boolean;
};

type ExportButtonProps = {
  videoUrl: string;
  transcript: TranscriptWord[];
  videoDuration: number;
  projectName: string;
};

export function ExportButton({
  videoUrl,
  transcript,
  videoDuration,
  projectName,
}: ExportButtonProps) {
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isExporting =
    progress !== null && progress.stage !== "done" && progress.stage !== "error";

  const handleExport = useCallback(async () => {
    setError(null);
    try {
      const blob = await exportVideo(
        videoUrl,
        transcript,
        videoDuration,
        setProgress
      );

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName.replace(/\.[^.]+$/, "")}_edited.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Export failed.");
      setProgress({
        stage: "error",
        percent: 0,
        message: err.message || "Export failed.",
      });
    }
  }, [videoUrl, transcript, videoDuration, projectName]);

  const hasDeletedWords = transcript.some((w) => w.isDeleted);

  return (
    <div className="mt-4">
      {/* Progress bar */}
      {progress && progress.stage !== "done" && progress.stage !== "error" && (
        <div className="mb-3 rounded-lg bg-surface p-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-text-muted">{progress.message}</span>
            <span className="font-medium text-white">{progress.percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-lighter">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Success message */}
      {progress?.stage === "done" && (
        <div className="mb-3 rounded-lg bg-success/10 border border-success/20 p-3 text-sm text-success">
          Video exported and download started!
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-3 rounded-lg bg-danger/10 border border-danger/20 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={isExporting || !hasDeletedWords}
        className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
          isExporting
            ? "bg-primary/50 text-white/50 cursor-wait"
            : hasDeletedWords
              ? "bg-primary text-white hover:bg-primary-dark"
              : "bg-surface-lighter text-text-muted cursor-not-allowed"
        }`}
      >
        {isExporting
          ? "Exporting..."
          : hasDeletedWords
            ? "Export Edited Video"
            : "Delete words to enable export"}
      </button>
    </div>
  );
}
