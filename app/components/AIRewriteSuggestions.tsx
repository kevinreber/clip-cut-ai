import { useState } from "react";

interface RewriteSuggestion {
  startIndex: number;
  endIndex: number;
  originalText: string;
  suggestedText: string;
  reason: string;
}

interface AIRewriteSuggestionsProps {
  suggestions: RewriteSuggestion[] | undefined;
  onGenerate: () => Promise<void>;
  isGenerating: boolean;
  onAccept: (suggestion: RewriteSuggestion) => void;
}

export function AIRewriteSuggestions({
  suggestions,
  onGenerate,
  isGenerating,
  onAccept,
}: AIRewriteSuggestionsProps) {
  const [expanded, setExpanded] = useState(true);
  const [acceptedIndices, setAcceptedIndices] = useState<Set<number>>(new Set());

  const handleAccept = (suggestion: RewriteSuggestion, index: number) => {
    onAccept(suggestion);
    setAcceptedIndices((prev) => new Set(prev).add(index));
  };

  const pendingSuggestions = suggestions?.filter((_, i) => !acceptedIndices.has(i)) || [];

  return (
    <div
      className="mt-3 rounded-lg border border-surface-lighter bg-surface-light"
      data-testid="ai-rewrite-suggestions"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-white">
          AI Rewrite Suggestions
          {suggestions && pendingSuggestions.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-text-muted">
              ({pendingSuggestions.length} suggestion{pendingSuggestions.length !== 1 ? "s" : ""})
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {suggestions && suggestions.length > 0 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="rounded-md bg-surface-lighter px-2 py-0.5 text-xs text-text-muted transition-colors hover:text-white"
            >
              {expanded ? "Collapse" : "Expand"}
            </button>
          )}
          <button
            onClick={() => {
              setAcceptedIndices(new Set());
              onGenerate();
            }}
            disabled={isGenerating}
            className="rounded-md bg-primary/20 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/30 disabled:opacity-50"
            data-testid="generate-rewrite-btn"
          >
            {isGenerating
              ? "Analyzing..."
              : suggestions
                ? "Re-analyze"
                : "Get Suggestions"}
          </button>
        </div>
      </div>

      {isGenerating && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="animate-spin">&#9881;</span>
            AI is finding sections that could be cleaner...
          </div>
        </div>
      )}

      {expanded && suggestions && suggestions.length > 0 && !isGenerating && (
        <div className="border-t border-surface-lighter">
          {suggestions.map((suggestion, i) => {
            const isAccepted = acceptedIndices.has(i);
            return (
              <div
                key={i}
                className={`px-4 py-3 border-b border-surface-lighter last:border-b-0 ${
                  isAccepted ? "opacity-50" : ""
                }`}
                data-testid={`rewrite-suggestion-${i}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Reason */}
                    <p className="text-[10px] text-text-muted italic">
                      {suggestion.reason}
                    </p>

                    {/* Original */}
                    <div>
                      <span className="text-[10px] font-medium text-red-400 uppercase tracking-wider block mb-0.5">
                        Original
                      </span>
                      <p className="text-xs text-text bg-red-500/10 rounded px-2 py-1.5 leading-relaxed line-through decoration-red-400/30">
                        {suggestion.originalText}
                      </p>
                    </div>

                    {/* Suggested */}
                    <div>
                      <span className="text-[10px] font-medium text-success uppercase tracking-wider block mb-0.5">
                        Suggested
                      </span>
                      <p className="text-xs text-text bg-success/10 rounded px-2 py-1.5 leading-relaxed">
                        {suggestion.suggestedText}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAccept(suggestion, i)}
                    disabled={isAccepted}
                    className={`shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      isAccepted
                        ? "bg-success/20 text-success"
                        : "bg-primary/20 text-primary hover:bg-primary/30"
                    }`}
                  >
                    {isAccepted ? "Accepted" : "Accept"}
                  </button>
                </div>
              </div>
            );
          })}

          {acceptedIndices.size > 0 && (
            <p className="px-4 py-2 text-[10px] text-text-muted/60">
              {acceptedIndices.size} of {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""} accepted. The original words have been marked as deleted.
            </p>
          )}
        </div>
      )}

      {expanded && suggestions && suggestions.length === 0 && !isGenerating && (
        <div className="border-t border-surface-lighter px-4 py-3">
          <p className="text-xs text-text-muted">
            No rewrite suggestions found. Your transcript looks clean!
          </p>
        </div>
      )}
    </div>
  );
}
