import { useState, useCallback } from "react";

interface TtsSegment {
  id: string;
  text: string;
  start: number;
  end: number;
  voice: string;
  status: "pending" | "generating" | "ready" | "error";
  audioFileId?: string;
}

interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  isFiller: boolean;
  isDeleted: boolean;
  confidence?: number;
}

interface TtsGapFillerProps {
  transcript: TranscriptWord[];
  ttsSegments: TtsSegment[] | undefined;
  onSuggestGaps: () => Promise<{ suggestions: TtsSegment[] }>;
  onGenerateTts: (segment: TtsSegment) => Promise<void>;
  onUpdateSegments: (segments: TtsSegment[]) => void;
  isSuggesting: boolean;
}

const VOICES = [
  { id: "alloy", name: "Alloy", description: "Neutral and balanced" },
  { id: "echo", name: "Echo", description: "Warm and clear" },
  { id: "fable", name: "Fable", description: "Expressive and British" },
  { id: "onyx", name: "Onyx", description: "Deep and authoritative" },
  { id: "nova", name: "Nova", description: "Friendly and upbeat" },
  { id: "shimmer", name: "Shimmer", description: "Soft and gentle" },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TtsGapFiller({
  transcript,
  ttsSegments: segmentsProp,
  onSuggestGaps,
  onGenerateTts,
  onUpdateSegments,
  isSuggesting,
}: TtsGapFillerProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("alloy");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const segments = segmentsProp || [];

  // Count deleted gaps in transcript
  const deletedGapCount = (() => {
    let count = 0;
    let inDeleted = false;
    for (const w of transcript) {
      if (w.isDeleted && !inDeleted) {
        inDeleted = true;
        count++;
      } else if (!w.isDeleted) {
        inDeleted = false;
      }
    }
    return count;
  })();

  const handleSuggestGaps = useCallback(async () => {
    try {
      const result = await onSuggestGaps();
      if (result.suggestions.length > 0) {
        const withVoice = result.suggestions.map((s) => ({
          ...s,
          voice: selectedVoice,
        }));
        onUpdateSegments([...segments, ...withVoice]);
      }
    } catch {
      // Error handled by parent toast
    }
  }, [onSuggestGaps, selectedVoice, segments, onUpdateSegments]);

  const handleGenerateSingle = useCallback(
    async (segment: TtsSegment) => {
      setGeneratingId(segment.id);
      try {
        // Update status to generating
        onUpdateSegments(
          segments.map((s) =>
            s.id === segment.id ? { ...s, status: "generating" as const } : s
          )
        );
        await onGenerateTts({ ...segment, voice: selectedVoice });
        onUpdateSegments(
          segments.map((s) =>
            s.id === segment.id
              ? { ...s, status: "ready" as const, voice: selectedVoice }
              : s
          )
        );
      } catch {
        onUpdateSegments(
          segments.map((s) =>
            s.id === segment.id ? { ...s, status: "error" as const } : s
          )
        );
      } finally {
        setGeneratingId(null);
      }
    },
    [segments, selectedVoice, onUpdateSegments, onGenerateTts]
  );

  const handleRemoveSegment = useCallback(
    (segmentId: string) => {
      onUpdateSegments(segments.filter((s) => s.id !== segmentId));
    },
    [segments, onUpdateSegments]
  );

  const handleEditText = useCallback(
    (segmentId: string) => {
      const seg = segments.find((s) => s.id === segmentId);
      if (seg) {
        setEditingId(segmentId);
        setEditText(seg.text);
      }
    },
    [segments]
  );

  const handleSaveEdit = useCallback(
    (segmentId: string) => {
      onUpdateSegments(
        segments.map((s) =>
          s.id === segmentId
            ? { ...s, text: editText, status: "pending" as const }
            : s
        )
      );
      setEditingId(null);
      setEditText("");
    },
    [segments, editText, onUpdateSegments]
  );

  const statusColors: Record<string, string> = {
    pending: "bg-text-muted/20 text-text-muted",
    generating: "bg-warning/20 text-warning animate-pulse",
    ready: "bg-success/20 text-success",
    error: "bg-danger/20 text-danger",
  };

  return (
    <div className="mt-3 rounded-lg border border-surface-lighter bg-surface-light" data-testid="tts-gap-filler">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        data-testid="tts-gap-filler-toggle"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">TTS Gap Filler</span>
          <span className="rounded-full bg-surface-lighter px-2 py-0.5 text-xs text-text-muted">
            {segments.length} segment{segments.length !== 1 ? "s" : ""}
          </span>
          {deletedGapCount > 0 && (
            <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs text-warning">
              {deletedGapCount} gap{deletedGapCount !== 1 ? "s" : ""} detected
            </span>
          )}
        </div>
        <span className="text-text-muted">{expanded ? "\u25B2" : "\u25BC"}</span>
      </button>

      {expanded && (
        <div className="border-t border-surface-lighter px-4 pb-4 pt-3">
          <p className="mb-3 text-xs text-text-muted">
            Generate AI voice to smoothly bridge deleted sections. Select a voice, then let AI suggest bridging text for gaps in your transcript.
          </p>

          {/* Voice selector */}
          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-text-muted">Voice</label>
            <div className="grid grid-cols-3 gap-1.5" data-testid="voice-selector">
              {VOICES.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`rounded-md px-2 py-1.5 text-xs transition-colors ${
                    selectedVoice === voice.id
                      ? "bg-primary text-white"
                      : "bg-surface-lighter text-text-muted hover:text-white"
                  }`}
                  title={voice.description}
                  data-testid={`voice-${voice.id}`}
                >
                  {voice.name}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="mb-3 flex gap-2">
            <button
              onClick={handleSuggestGaps}
              disabled={isSuggesting || deletedGapCount === 0}
              className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/80 disabled:opacity-50"
              data-testid="suggest-gaps-btn"
            >
              {isSuggesting ? "Analyzing gaps..." : "AI Suggest Bridging Text"}
            </button>
            {segments.length > 0 && (
              <button
                onClick={() => onUpdateSegments([])}
                className="rounded-md bg-surface-lighter px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-white"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Segments list */}
          {segments.length > 0 && (
            <div className="space-y-2" data-testid="tts-segments-list">
              {segments.map((segment) => (
                <div
                  key={segment.id}
                  className="rounded-md border border-surface-lighter bg-surface p-2.5"
                  data-testid={`tts-segment-${segment.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-text-muted tabular-nums">
                          {formatTime(segment.start)} - {formatTime(segment.end)}
                        </span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusColors[segment.status]}`}
                        >
                          {segment.status}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {VOICES.find((v) => v.id === segment.voice)?.name || segment.voice}
                        </span>
                      </div>
                      {editingId === segment.id ? (
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="flex-1 rounded bg-surface-lighter px-2 py-1 text-xs text-white outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(segment.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                          <button
                            onClick={() => handleSaveEdit(segment.id)}
                            className="rounded bg-success/20 px-2 py-1 text-[10px] text-success"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-white/80 italic">
                          &ldquo;{segment.text}&rdquo;
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleEditText(segment.id)}
                        className="rounded bg-surface-lighter px-1.5 py-0.5 text-[10px] text-text-muted hover:text-white"
                        title="Edit text"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleGenerateSingle(segment)}
                        disabled={generatingId === segment.id || !segment.text}
                        className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/30 disabled:opacity-50"
                        title="Generate audio"
                        data-testid={`generate-tts-${segment.id}`}
                      >
                        {generatingId === segment.id ? "..." : "Generate"}
                      </button>
                      <button
                        onClick={() => handleRemoveSegment(segment.id)}
                        className="rounded bg-danger/20 px-1.5 py-0.5 text-[10px] text-danger hover:bg-danger/30"
                        title="Remove"
                      >
                        &#10005;
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {segments.length === 0 && deletedGapCount === 0 && (
            <p className="text-xs text-text-muted/60 text-center py-2">
              Delete some words from the transcript first to create gaps that can be filled with AI voice.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
