import { useState } from "react";

interface Chapter {
  title: string;
  start: number;
  end: number;
}

interface ChapterMarkersProps {
  chapters: Chapter[] | undefined;
  onGenerate: () => Promise<void>;
  isGenerating: boolean;
  onSeek: (time: number) => void;
  currentTime: number;
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

export function ChapterMarkers({
  chapters,
  onGenerate,
  isGenerating,
  onSeek,
  currentTime,
}: ChapterMarkersProps) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const activeChapterIndex = chapters
    ? chapters.findIndex(
        (ch) => currentTime >= ch.start && currentTime < ch.end
      )
    : -1;

  const handleCopyYouTube = async () => {
    if (!chapters) return;
    const text = chapters
      .map((ch) => `${formatTimestamp(ch.start)} ${ch.title}`)
      .join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="mt-3 rounded-lg border border-surface-lighter bg-surface-light"
      data-testid="chapter-markers"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-white">
          Chapters
          {chapters && (
            <span className="ml-1.5 text-xs font-normal text-text-muted">
              ({chapters.length})
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {chapters && chapters.length > 0 && (
            <>
              <button
                onClick={handleCopyYouTube}
                className="rounded-md bg-surface-lighter px-2 py-0.5 text-xs text-text-muted transition-colors hover:text-white"
                title="Copy as YouTube chapter format"
                data-testid="copy-chapters-btn"
              >
                {copied ? "Copied!" : "Copy for YouTube"}
              </button>
              <button
                onClick={() => setExpanded((e) => !e)}
                className="rounded-md bg-surface-lighter px-2 py-0.5 text-xs text-text-muted transition-colors hover:text-white"
              >
                {expanded ? "Collapse" : "Expand"}
              </button>
            </>
          )}
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="rounded-md bg-primary/20 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/30 disabled:opacity-50"
            data-testid="generate-chapters-btn"
          >
            {isGenerating
              ? "Generating..."
              : chapters
                ? "Regenerate"
                : "Generate"}
          </button>
        </div>
      </div>

      {isGenerating && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="animate-spin">&#9881;</span>
            AI is detecting topic boundaries...
          </div>
        </div>
      )}

      {expanded && chapters && chapters.length > 0 && !isGenerating && (
        <div className="border-t border-surface-lighter">
          {chapters.map((chapter, i) => {
            const isActive = i === activeChapterIndex;
            const duration = chapter.end - chapter.start;
            return (
              <button
                key={i}
                onClick={() => onSeek(chapter.start)}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-lighter ${
                  isActive ? "bg-primary/10 border-l-2 border-primary" : ""
                }`}
                data-testid={`chapter-${i}`}
              >
                <span className="shrink-0 text-xs font-mono text-primary tabular-nums">
                  {formatTimestamp(chapter.start)}
                </span>
                <span
                  className={`text-sm ${isActive ? "text-white font-medium" : "text-text"}`}
                >
                  {chapter.title}
                </span>
                <span className="ml-auto text-xs text-text-muted/50">
                  {formatTimestamp(duration)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
