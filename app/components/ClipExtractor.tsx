import { useState } from "react";

interface Clip {
  title: string;
  description: string;
  start: number;
  end: number;
  score: number;
  tags: string[];
}

interface ClipExtractorProps {
  clips: Clip[] | undefined;
  onGenerate: () => Promise<void>;
  isGenerating: boolean;
  onSeek: (time: number) => void;
  currentTime: number;
  videoDuration: number;
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const SCORE_COLORS: Record<string, string> = {
  high: "text-success",
  medium: "text-warning",
  low: "text-text-muted",
};

function getScoreLevel(score: number): string {
  if (score >= 8) return "high";
  if (score >= 5) return "medium";
  return "low";
}

const TAG_COLORS: Record<string, string> = {
  funny: "bg-yellow-500/20 text-yellow-400",
  insightful: "bg-blue-500/20 text-blue-400",
  educational: "bg-green-500/20 text-green-400",
  emotional: "bg-pink-500/20 text-pink-400",
  controversial: "bg-red-500/20 text-red-400",
  inspiring: "bg-purple-500/20 text-purple-400",
  practical: "bg-teal-500/20 text-teal-400",
};

function getTagColor(tag: string): string {
  const lower = tag.toLowerCase();
  return TAG_COLORS[lower] || "bg-surface-lighter text-text-muted";
}

export function ClipExtractor({
  clips,
  onGenerate,
  isGenerating,
  onSeek,
  currentTime,
  videoDuration,
}: ClipExtractorProps) {
  const [expanded, setExpanded] = useState(true);

  const activeClipIndex = clips
    ? clips.findIndex((c) => currentTime >= c.start && currentTime < c.end)
    : -1;

  return (
    <div
      className="mt-3 rounded-lg border border-surface-lighter bg-surface-light"
      data-testid="clip-extractor"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-white">
          AI Clip Extraction
          {clips && (
            <span className="ml-1.5 text-xs font-normal text-text-muted">
              ({clips.length} clip{clips.length !== 1 ? "s" : ""})
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {clips && clips.length > 0 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="rounded-md bg-surface-lighter px-2 py-0.5 text-xs text-text-muted transition-colors hover:text-white"
            >
              {expanded ? "Collapse" : "Expand"}
            </button>
          )}
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="rounded-md bg-primary/20 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/30 disabled:opacity-50"
            data-testid="extract-clips-btn"
          >
            {isGenerating
              ? "Extracting..."
              : clips
                ? "Re-extract"
                : "Find Best Clips"}
          </button>
        </div>
      </div>

      {isGenerating && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="animate-spin">&#9881;</span>
            AI is finding the best clips for social media...
          </div>
        </div>
      )}

      {expanded && clips && clips.length > 0 && !isGenerating && (
        <div className="border-t border-surface-lighter">
          {clips.map((clip, i) => {
            const isActive = i === activeClipIndex;
            const duration = clip.end - clip.start;
            const scoreLevel = getScoreLevel(clip.score);
            return (
              <button
                key={i}
                onClick={() => onSeek(clip.start)}
                className={`flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors hover:bg-surface-lighter ${
                  isActive ? "bg-primary/10 border-l-2 border-primary" : ""
                }`}
                data-testid={`clip-${i}`}
              >
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-xs font-mono text-primary tabular-nums">
                    {formatTimestamp(clip.start)} - {formatTimestamp(clip.end)}
                  </span>
                  <span className="ml-auto text-xs text-text-muted">
                    {formatDuration(duration)}
                  </span>
                  <span
                    className={`text-xs font-bold tabular-nums ${SCORE_COLORS[scoreLevel]}`}
                    title={`Quality score: ${clip.score}/10`}
                  >
                    {clip.score}/10
                  </span>
                </div>
                <span
                  className={`text-sm font-medium ${isActive ? "text-white" : "text-text"}`}
                >
                  {clip.title}
                </span>
                <span className="text-xs text-text-muted leading-relaxed">
                  {clip.description}
                </span>
                {clip.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {clip.tags.map((tag, j) => (
                      <span
                        key={j}
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${getTagColor(tag)}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {/* Mini progress bar showing clip position in video */}
                <div className="h-1 w-full overflow-hidden rounded-full bg-surface-lighter mt-1">
                  <div
                    className="h-full rounded-full bg-primary/40"
                    style={{
                      marginLeft: `${(clip.start / videoDuration) * 100}%`,
                      width: `${(duration / videoDuration) * 100}%`,
                    }}
                  />
                </div>
              </button>
            );
          })}
          <p className="px-4 py-2 text-[10px] text-text-muted/60">
            Click a clip to preview it. Higher scores indicate greater social media potential.
          </p>
        </div>
      )}
    </div>
  );
}
