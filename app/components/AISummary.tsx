import { useState } from "react";

interface AISummaryProps {
  summary: string | undefined;
  showNotes: string | undefined;
  onGenerate: () => Promise<void>;
  isGenerating: boolean;
}

export function AISummary({
  summary,
  showNotes,
  onGenerate,
  isGenerating,
}: AISummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="mt-3 rounded-lg border border-surface-lighter bg-surface-light"
      data-testid="ai-summary"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-white">
          AI Summary & Show Notes
        </h3>
        <div className="flex items-center gap-2">
          {showNotes && (
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
            data-testid="generate-summary-btn"
          >
            {isGenerating
              ? "Generating..."
              : summary
                ? "Regenerate"
                : "Generate"}
          </button>
        </div>
      </div>

      {isGenerating && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="animate-spin">&#9881;</span>
            AI is analyzing your transcript...
          </div>
        </div>
      )}

      {summary && !isGenerating && (
        <div className="border-t border-surface-lighter px-4 py-3">
          <p className="text-sm text-text leading-relaxed">{summary}</p>
        </div>
      )}

      {expanded && showNotes && !isGenerating && (
        <div className="border-t border-surface-lighter px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-muted">
              Full Show Notes
            </span>
            <button
              onClick={() => handleCopy(showNotes)}
              className="rounded-md bg-surface-lighter px-2 py-0.5 text-xs text-text-muted transition-colors hover:text-white"
              data-testid="copy-show-notes-btn"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="prose-sm max-w-none text-sm text-text leading-relaxed whitespace-pre-wrap">
            {showNotes
              .split("\n")
              .map((line, i) => {
                if (line.startsWith("## ")) {
                  return (
                    <h4
                      key={i}
                      className="mt-3 mb-1 text-xs font-semibold text-white uppercase tracking-wider"
                    >
                      {line.replace("## ", "")}
                    </h4>
                  );
                }
                if (line.startsWith("- ")) {
                  return (
                    <div key={i} className="flex gap-1.5 ml-1">
                      <span className="text-primary shrink-0">&#8226;</span>
                      <span>{line.replace("- ", "")}</span>
                    </div>
                  );
                }
                if (line.trim() === "") return null;
                return (
                  <p key={i} className="my-0.5">
                    {line}
                  </p>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
