import { useState } from "react";

interface RepurposeContent {
  blogPost: string;
  linkedinPost: string;
  twitterThread: string;
  newsletterSnippet: string;
  youtubeDescription: string;
  generatedAt: number;
}

interface ContentRepurposeProps {
  content: RepurposeContent | undefined;
  onGenerate: () => Promise<void>;
  isGenerating: boolean;
}

type FormatKey = keyof Omit<RepurposeContent, "generatedAt">;

const FORMATS: { key: FormatKey; label: string; icon: string }[] = [
  { key: "blogPost", label: "Blog Post", icon: "\u270D" },
  { key: "linkedinPost", label: "LinkedIn", icon: "\uD83D\uDCBC" },
  { key: "twitterThread", label: "Twitter/X", icon: "\uD83D\uDCAC" },
  { key: "newsletterSnippet", label: "Newsletter", icon: "\u2709" },
  { key: "youtubeDescription", label: "YouTube", icon: "\u25B6" },
];

export function ContentRepurpose({
  content,
  onGenerate,
  isGenerating,
}: ContentRepurposeProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeFormat, setActiveFormat] = useState<FormatKey>("blogPost");
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const handleCopy = async (format: FormatKey) => {
    if (!content) return;
    const text = content[format];
    await navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const activeContent = content ? content[activeFormat] : "";

  return (
    <div
      className="mt-3 rounded-lg border border-surface-lighter bg-surface-light"
      data-testid="content-repurpose"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-white">
          Content Repurposing
          {content && (
            <span className="ml-1.5 text-xs font-normal text-text-muted">
              (5 formats)
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {content && (
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
            data-testid="repurpose-btn"
          >
            {isGenerating
              ? "Generating..."
              : content
                ? "Regenerate"
                : "Repurpose Content"}
          </button>
        </div>
      </div>

      {isGenerating && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="animate-spin">&#9881;</span>
            AI is repurposing your video into 5 formats...
          </div>
        </div>
      )}

      {expanded && content && !isGenerating && (
        <div className="border-t border-surface-lighter">
          {/* Format tabs */}
          <div className="flex gap-1 overflow-x-auto px-4 pt-3 pb-2">
            {FORMATS.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFormat(f.key)}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeFormat === f.key
                    ? "bg-primary/20 text-primary"
                    : "bg-surface-lighter text-text-muted hover:text-white"
                }`}
                data-testid={`repurpose-tab-${f.key}`}
              >
                <span className="mr-1">{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>

          {/* Content display */}
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-muted">
                {FORMATS.find((f) => f.key === activeFormat)?.label}
              </span>
              <button
                onClick={() => handleCopy(activeFormat)}
                className="rounded-md bg-surface-lighter px-2 py-0.5 text-xs text-text-muted transition-colors hover:text-white"
                data-testid="copy-repurpose-btn"
              >
                {copiedFormat === activeFormat ? "Copied!" : "Copy"}
              </button>
            </div>
            <div
              className="max-h-80 overflow-y-auto rounded-md bg-surface p-3 text-sm text-text leading-relaxed whitespace-pre-wrap"
              data-testid="repurpose-content-display"
            >
              {renderContent(activeFormat, activeContent)}
            </div>
          </div>

          {/* Quick copy all buttons */}
          <div className="border-t border-surface-lighter px-4 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-text-muted/60">
                Quick copy:
              </span>
              {FORMATS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => handleCopy(f.key)}
                  className="rounded bg-surface-lighter px-2 py-0.5 text-[10px] text-text-muted transition-colors hover:text-white"
                  data-testid={`quick-copy-${f.key}`}
                >
                  {copiedFormat === f.key ? "Copied!" : `${f.icon} ${f.label}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderContent(format: FormatKey, text: string) {
  if (!text) return <span className="text-text-muted italic">No content generated.</span>;

  if (format === "blogPost") {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("# ")) {
        return (
          <h3 key={i} className="mt-2 mb-1 text-base font-bold text-white">
            {line.replace("# ", "")}
          </h3>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h4 key={i} className="mt-3 mb-1 text-sm font-semibold text-white">
            {line.replace("## ", "")}
          </h4>
        );
      }
      if (line.startsWith("- ")) {
        return (
          <div key={i} className="flex gap-1.5 ml-2">
            <span className="text-primary shrink-0">&#8226;</span>
            <span>{line.replace("- ", "")}</span>
          </div>
        );
      }
      if (line.trim() === "") return <div key={i} className="h-2" />;
      return <p key={i} className="my-1">{line}</p>;
    });
  }

  if (format === "twitterThread") {
    return text.split("\n").filter(l => l.trim()).map((line, i) => {
      const isNumbered = /^\d+\/\s/.test(line);
      return (
        <div
          key={i}
          className={`${isNumbered ? "rounded-md bg-surface-lighter p-2 mb-2" : "mb-1"}`}
        >
          {isNumbered && (
            <span className="text-[10px] font-bold text-primary mr-1">
              Tweet {line.match(/^(\d+)\//)?.[1]}
            </span>
          )}
          <span>{isNumbered ? line.replace(/^\d+\/\s*/, "") : line}</span>
        </div>
      );
    });
  }

  // Default: render with basic markdown-like formatting
  return text.split("\n").map((line, i) => {
    if (line.startsWith("- ")) {
      return (
        <div key={i} className="flex gap-1.5 ml-1">
          <span className="text-primary shrink-0">&#8226;</span>
          <span>{line.replace("- ", "")}</span>
        </div>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-2" />;
    return <p key={i} className="my-0.5">{line}</p>;
  });
}
