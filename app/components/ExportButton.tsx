import { useState, useCallback } from "react";
import { exportVideo, type ExportProgress, type ExportQuality } from "../lib/video-export";
import {
  generateSrt,
  generateVtt,
  generatePlainText,
  downloadTextFile,
} from "../lib/subtitle-export";

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

const QUALITY_LABELS: Record<ExportQuality, { label: string; desc: string }> = {
  original: { label: "Original", desc: "No re-encoding, preserves source quality (fastest)" },
  fast: { label: "Fast", desc: "Quick re-encode, larger file" },
  balanced: { label: "Balanced", desc: "Good quality, moderate speed" },
  high: { label: "High Quality", desc: "Best quality, slower export" },
};

export function ExportButton({
  videoUrl,
  transcript,
  videoDuration,
  projectName,
}: ExportButtonProps) {
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState<ExportQuality>("original");

  const isExporting =
    progress !== null && progress.stage !== "done" && progress.stage !== "error";

  const handleExport = useCallback(async () => {
    setError(null);
    try {
      const blob = await exportVideo(
        videoUrl,
        transcript,
        videoDuration,
        setProgress,
        quality
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
  }, [videoUrl, transcript, videoDuration, projectName, quality]);

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

      {/* Quality selector */}
      {hasDeletedWords && !isExporting && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-text-muted">Quality:</span>
          {(Object.keys(QUALITY_LABELS) as ExportQuality[]).map((q) => (
            <button
              key={q}
              onClick={() => setQuality(q)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                quality === q
                  ? "bg-primary text-white"
                  : "bg-surface-lighter text-text-muted hover:text-white"
              }`}
              title={QUALITY_LABELS[q].desc}
            >
              {QUALITY_LABELS[q].label}
            </button>
          ))}
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
            ? `Export Edited Video (${QUALITY_LABELS[quality].label})`
            : "Delete words to enable export"}
      </button>

      {/* Subtitle / transcript export */}
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => {
            const baseName = projectName.replace(/\.[^.]+$/, "");
            downloadTextFile(generateSrt(transcript), `${baseName}.srt`, "text/srt");
          }}
          className="flex-1 rounded-lg border border-surface-lighter px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:border-primary hover:text-white"
        >
          Export SRT
        </button>
        <button
          onClick={() => {
            const baseName = projectName.replace(/\.[^.]+$/, "");
            downloadTextFile(generateVtt(transcript), `${baseName}.vtt`, "text/vtt");
          }}
          className="flex-1 rounded-lg border border-surface-lighter px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:border-primary hover:text-white"
        >
          Export VTT
        </button>
        <button
          onClick={() => {
            const baseName = projectName.replace(/\.[^.]+$/, "");
            downloadTextFile(
              generatePlainText(transcript),
              `${baseName}.txt`,
              "text/plain"
            );
          }}
          className="flex-1 rounded-lg border border-surface-lighter px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:border-primary hover:text-white"
        >
          Export Text
        </button>
      </div>
    </div>
  );
}
