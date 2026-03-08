import { useState, useCallback, useRef } from "react";
import { exportVideo, exportAudio, type ExportProgress, type ExportQuality } from "../lib/video-export";
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
  confidence?: number;
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
  const [exportFormat, setExportFormat] = useState<"video" | "audio">("video");
  const startTimeRef = useRef<number>(0);
  const [eta, setEta] = useState<string>("");

  const isExporting =
    progress !== null && progress.stage !== "done" && progress.stage !== "error";

  const handleProgressWithEta = useCallback((p: ExportProgress) => {
    setProgress(p);
    if (p.percent > 5 && p.stage !== "done" && p.stage !== "error") {
      const elapsed = Date.now() - startTimeRef.current;
      const totalEstimate = elapsed / (p.percent / 100);
      const remaining = totalEstimate - elapsed;
      if (remaining > 1000) {
        const secs = Math.ceil(remaining / 1000);
        setEta(secs > 60 ? `~${Math.ceil(secs / 60)}m remaining` : `~${secs}s remaining`);
      } else {
        setEta("Almost done...");
      }
    } else {
      setEta("");
    }
  }, []);

  const handleExport = useCallback(async () => {
    setError(null);
    startTimeRef.current = Date.now();
    try {
      let blob: Blob;
      let filename: string;
      if (exportFormat === "audio") {
        blob = await exportAudio(
          videoUrl,
          transcript,
          videoDuration,
          handleProgressWithEta,
          quality
        );
        filename = `${projectName.replace(/\.[^.]+$/, "")}_audio.mp3`;
      } else {
        blob = await exportVideo(
          videoUrl,
          transcript,
          videoDuration,
          handleProgressWithEta,
          quality
        );
        filename = `${projectName.replace(/\.[^.]+$/, "")}_edited.mp4`;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
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
  }, [videoUrl, transcript, videoDuration, projectName, quality, exportFormat, handleProgressWithEta]);

  const hasDeletedWords = transcript.some((w) => w.isDeleted);

  return (
    <div className="mt-4" data-testid="export-section">
      {/* Progress bar */}
      {progress && progress.stage !== "done" && progress.stage !== "error" && (
        <div className="mb-3 rounded-lg bg-surface p-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-text-muted">{progress.message}</span>
            <div className="flex items-center gap-2">
              {eta && (
                <span className="text-text-muted" data-testid="export-eta">
                  {eta}
                </span>
              )}
              <span className="font-medium text-white">{progress.percent}%</span>
            </div>
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
          {exportFormat === "audio" ? "Audio" : "Video"} exported and download started!
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-3 rounded-lg bg-danger/10 border border-danger/20 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Format & Quality selectors */}
      {hasDeletedWords && !isExporting && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Format:</span>
            <button
              onClick={() => setExportFormat("video")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                exportFormat === "video"
                  ? "bg-primary text-white"
                  : "bg-surface-lighter text-text-muted hover:text-white"
              }`}
              data-testid="format-video"
            >
              Video (MP4)
            </button>
            <button
              onClick={() => setExportFormat("audio")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                exportFormat === "audio"
                  ? "bg-primary text-white"
                  : "bg-surface-lighter text-text-muted hover:text-white"
              }`}
              data-testid="format-audio"
            >
              Audio (MP3)
            </button>
          </div>
          <div className="flex items-center gap-2">
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
            ? `Export ${exportFormat === "audio" ? "Audio" : "Edited Video"} (${QUALITY_LABELS[quality].label})`
            : "Delete words to enable export"}
      </button>

      {/* Subtitle / transcript export */}
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => {
            const baseName = projectName.replace(/\.[^.]+$/, "");
            downloadTextFile(generateSrt(transcript), `${baseName}.srt`, "text/srt");
          }}
          title="SubRip Subtitle — widely supported format for video subtitles with timestamps. Works with most video players and editing software."
          className="flex-1 rounded-lg border border-surface-lighter px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:border-primary hover:text-white"
        >
          Export SRT
        </button>
        <button
          onClick={() => {
            const baseName = projectName.replace(/\.[^.]+$/, "");
            downloadTextFile(generateVtt(transcript), `${baseName}.vtt`, "text/vtt");
          }}
          title="Web Video Text Tracks — subtitle format designed for web browsers and HTML5 video. Used by YouTube, web apps, and streaming platforms."
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
          title="Plain text transcript without timestamps. Useful for scripts, notes, or further editing."
          className="flex-1 rounded-lg border border-surface-lighter px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:border-primary hover:text-white"
        >
          Export Text
        </button>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-text-muted/60">
        SRT &amp; VTT are subtitle formats with timestamps — SRT works with most video players, VTT is optimized for web
      </p>
    </div>
  );
}
