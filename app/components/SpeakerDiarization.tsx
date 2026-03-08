import { useState } from "react";

interface Speaker {
  name: string;
  color: string;
  wordIndices: number[];
}

interface SpeakerDiarizationProps {
  speakers: Speaker[] | undefined;
  onGenerate: () => Promise<void>;
  isGenerating: boolean;
  totalWords: number;
}

export function SpeakerDiarization({
  speakers,
  onGenerate,
  isGenerating,
  totalWords,
}: SpeakerDiarizationProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      className="mt-3 rounded-lg border border-surface-lighter bg-surface-light"
      data-testid="speaker-diarization"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-white">
          Speaker Diarization
          {speakers && (
            <span className="ml-1.5 text-xs font-normal text-text-muted">
              ({speakers.length} speaker{speakers.length !== 1 ? "s" : ""})
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {speakers && speakers.length > 0 && (
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
            data-testid="identify-speakers-btn"
          >
            {isGenerating
              ? "Identifying..."
              : speakers
                ? "Re-identify"
                : "Identify Speakers"}
          </button>
        </div>
      </div>

      {isGenerating && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="animate-spin">&#9881;</span>
            AI is identifying speakers in your transcript...
          </div>
        </div>
      )}

      {expanded && speakers && speakers.length > 0 && !isGenerating && (
        <div className="border-t border-surface-lighter px-4 py-3">
          <div className="space-y-2">
            {speakers.map((speaker, i) => {
              const wordPercent =
                totalWords > 0
                  ? Math.round((speaker.wordIndices.length / totalWords) * 100)
                  : 0;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3"
                  data-testid={`speaker-${i}`}
                >
                  <div
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: speaker.color }}
                  />
                  <span className="text-sm font-medium text-white">
                    {speaker.name}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-text-muted">
                      {speaker.wordIndices.length} words
                    </span>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-lighter">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${wordPercent}%`,
                          backgroundColor: speaker.color,
                        }}
                      />
                    </div>
                    <span className="text-xs text-text-muted tabular-nums">
                      {wordPercent}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[10px] text-text-muted/60">
            Speaker colors are shown in the transcript when diarization is active
          </p>
        </div>
      )}
    </div>
  );
}
