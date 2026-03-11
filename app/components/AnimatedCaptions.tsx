import { useState, useCallback, useRef } from "react";

type TranscriptWord = {
  word: string;
  start: number;
  end: number;
  isFiller: boolean;
  isDeleted: boolean;
  confidence?: number;
};

type CaptionStyle = "classic" | "bold-pop" | "karaoke" | "minimal";

interface AnimatedCaptionsProps {
  transcript: TranscriptWord[];
  videoDuration: number;
  projectName: string;
  currentCaptionStyle: string | undefined;
  onStyleChange: (style: string) => void;
}

const CAPTION_STYLES: Record<
  CaptionStyle,
  { label: string; desc: string; preview: string }
> = {
  classic: {
    label: "Classic",
    desc: "Standard centered subtitles with white text",
    preview: "Aa",
  },
  "bold-pop": {
    label: "Bold Pop",
    desc: "Large, bold text with word-by-word highlight (TikTok style)",
    preview: "Aa",
  },
  karaoke: {
    label: "Karaoke",
    desc: "Words highlight progressively as they are spoken",
    preview: "Aa",
  },
  minimal: {
    label: "Minimal",
    desc: "Small, lower-third subtitles with a subtle background",
    preview: "Aa",
  },
};

const STYLE_CLASSES: Record<CaptionStyle, string> = {
  classic: "text-white text-base font-medium",
  "bold-pop": "text-yellow-300 text-xl font-black uppercase",
  karaoke: "text-white text-lg font-bold",
  minimal: "text-white/80 text-sm font-normal",
};

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

function generateWordLevelSrt(transcript: TranscriptWord[]): string {
  const kept = transcript.filter(
    (w) => !w.isDeleted && !w.word.startsWith("[silence")
  );
  return kept
    .map(
      (w, i) =>
        `${i + 1}\n${formatSrtTime(w.start)} --> ${formatSrtTime(w.end)}\n${w.word}`
    )
    .join("\n\n");
}

function generateWordLevelAss(
  transcript: TranscriptWord[],
  style: CaptionStyle
): string {
  const kept = transcript.filter(
    (w) => !w.isDeleted && !w.word.startsWith("[silence")
  );

  // Group words into cues (3-5 words each for animated display)
  const cues: { words: TranscriptWord[]; start: number; end: number }[] = [];
  let cueWords: TranscriptWord[] = [];
  for (const word of kept) {
    cueWords.push(word);
    if (cueWords.length >= 4 || word.end - cueWords[0].start > 2.5) {
      cues.push({
        words: [...cueWords],
        start: cueWords[0].start,
        end: cueWords[cueWords.length - 1].end,
      });
      cueWords = [];
    }
  }
  if (cueWords.length > 0) {
    cues.push({
      words: [...cueWords],
      start: cueWords[0].start,
      end: cueWords[cueWords.length - 1].end,
    });
  }

  // ASS header
  const styleConfig = {
    classic: {
      fontName: "Arial",
      fontSize: 48,
      primaryColor: "&H00FFFFFF",
      bold: 0,
      outline: 2,
      alignment: 2,
    },
    "bold-pop": {
      fontName: "Impact",
      fontSize: 64,
      primaryColor: "&H0000FFFF",
      bold: -1,
      outline: 3,
      alignment: 2,
    },
    karaoke: {
      fontName: "Arial",
      fontSize: 52,
      primaryColor: "&H00FFFFFF",
      bold: -1,
      outline: 2,
      alignment: 2,
    },
    minimal: {
      fontName: "Arial",
      fontSize: 36,
      primaryColor: "&H00CCCCCC",
      bold: 0,
      outline: 1,
      alignment: 2,
    },
  }[style];

  const formatAssTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    const cs = Math.round((s % 1) * 100);
    return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
  };

  let ass = `[Script Info]
Title: ClipCut AI Captions
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${styleConfig.fontName},${styleConfig.fontSize},${styleConfig.primaryColor},&H000000FF,&H00000000,&H80000000,${styleConfig.bold},0,0,0,100,100,0,0,1,${styleConfig.outline},1,${styleConfig.alignment},20,20,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  for (const cue of cues) {
    const text =
      style === "karaoke"
        ? cue.words
            .map((w) => {
              const dur = Math.round((w.end - w.start) * 100);
              return `{\\kf${dur}}${w.word}`;
            })
            .join(" ")
        : cue.words.map((w) => w.word).join(" ");

    ass += `Dialogue: 0,${formatAssTime(cue.start)},${formatAssTime(cue.end)},Default,,0,0,0,,${text}\n`;
  }

  return ass;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AnimatedCaptions({
  transcript,
  videoDuration: _videoDuration,
  projectName,
  currentCaptionStyle,
  onStyleChange,
}: AnimatedCaptionsProps) {
  const [expanded, setExpanded] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState<CaptionStyle>(
    (currentCaptionStyle as CaptionStyle) || "bold-pop"
  );
  const [previewWord, setPreviewWord] = useState(0);
  const previewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const sampleWords = ["This", "is", "how", "your", "captions", "look"];

  const handleStyleChange = useCallback(
    (style: CaptionStyle) => {
      setSelectedStyle(style);
      onStyleChange(style);
    },
    [onStyleChange]
  );

  const togglePreview = useCallback(() => {
    if (isPreviewing) {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
      setIsPreviewing(false);
      setPreviewWord(0);
    } else {
      setIsPreviewing(true);
      setPreviewWord(0);
      previewTimerRef.current = setInterval(() => {
        setPreviewWord((p) => {
          if (p >= sampleWords.length - 1) {
            if (previewTimerRef.current) clearInterval(previewTimerRef.current);
            setIsPreviewing(false);
            return 0;
          }
          return p + 1;
        });
      }, 400);
    }
  }, [isPreviewing, sampleWords.length]);

  const baseName = projectName.replace(/\.[^.]+$/, "");

  const handleExportWordSrt = useCallback(() => {
    downloadFile(
      generateWordLevelSrt(transcript),
      `${baseName}_word_captions.srt`,
      "text/srt"
    );
  }, [transcript, baseName]);

  const handleExportAss = useCallback(() => {
    downloadFile(
      generateWordLevelAss(transcript, selectedStyle),
      `${baseName}_animated_captions.ass`,
      "text/ass"
    );
  }, [transcript, selectedStyle, baseName]);

  const keptWords = transcript.filter(
    (w) => !w.isDeleted && !w.word.startsWith("[silence")
  );

  return (
    <div
      className="mt-3 rounded-lg border border-surface-lighter bg-surface-light"
      data-testid="animated-captions"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-white">
          Animated Captions
          <span className="ml-1.5 text-xs font-normal text-text-muted">
            ({keptWords.length} words)
          </span>
        </h3>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="rounded-md bg-surface-lighter px-2 py-0.5 text-xs text-text-muted transition-colors hover:text-white"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-surface-lighter px-4 py-3">
          {/* Style selector */}
          <div className="mb-3">
            <span className="text-xs font-medium text-text-muted mb-2 block">
              Caption Style
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CAPTION_STYLES) as CaptionStyle[]).map((style) => (
                <button
                  key={style}
                  onClick={() => handleStyleChange(style)}
                  className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors ${
                    selectedStyle === style
                      ? "border-primary bg-primary/10"
                      : "border-surface-lighter hover:border-primary/50"
                  }`}
                  data-testid={`caption-style-${style}`}
                >
                  <span
                    className={`mb-0.5 ${STYLE_CLASSES[style]} leading-tight`}
                    style={{ fontSize: "14px" }}
                  >
                    {CAPTION_STYLES[style].preview}
                  </span>
                  <span className="text-xs font-medium text-white">
                    {CAPTION_STYLES[style].label}
                  </span>
                  <span className="text-[10px] text-text-muted leading-tight">
                    {CAPTION_STYLES[style].desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-text-muted">
                Preview
              </span>
              <button
                onClick={togglePreview}
                className="rounded-md bg-surface-lighter px-2 py-0.5 text-xs text-text-muted transition-colors hover:text-white"
                data-testid="preview-captions-btn"
              >
                {isPreviewing ? "Stop" : "Play Preview"}
              </button>
            </div>
            <div className="flex h-16 items-center justify-center rounded-lg bg-black">
              <span className={STYLE_CLASSES[selectedStyle]}>
                {selectedStyle === "karaoke" ? (
                  <span>
                    {sampleWords.map((w, i) => (
                      <span
                        key={i}
                        className={
                          i <= previewWord
                            ? "text-yellow-300 transition-colors duration-200"
                            : "text-white/40 transition-colors duration-200"
                        }
                      >
                        {w}{" "}
                      </span>
                    ))}
                  </span>
                ) : selectedStyle === "bold-pop" ? (
                  <span className="transition-all duration-150">
                    {sampleWords[previewWord] || sampleWords[0]}
                  </span>
                ) : (
                  <span>{sampleWords.slice(0, previewWord + 1).join(" ")}</span>
                )}
              </span>
            </div>
          </div>

          {/* Export buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleExportWordSrt}
              className="flex-1 rounded-lg border border-surface-lighter px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:border-primary hover:text-white"
              title="Word-level SRT with individual word timing for word-by-word caption animation"
              data-testid="export-word-srt"
            >
              Export Word SRT
            </button>
            <button
              onClick={handleExportAss}
              className="flex-1 rounded-lg border border-surface-lighter px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:border-primary hover:text-white"
              title="Advanced SubStation Alpha format with animated caption styling and karaoke effects"
              data-testid="export-ass"
            >
              Export Styled ASS
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-text-muted/60">
            Word SRT provides per-word timing for editors. ASS includes animation styling for players like VLC and video editors.
          </p>
        </div>
      )}
    </div>
  );
}
