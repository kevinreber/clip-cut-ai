import { useCallback, useMemo, useRef, useState } from "react";

interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  isFiller: boolean;
  isDeleted: boolean;
  confidence?: number;
}

interface Paragraph {
  id: number;
  words: TranscriptWord[];
  startIndex: number;
  endIndex: number;
  isDeleted: boolean;
}

interface TextBasedEditorProps {
  transcript: TranscriptWord[];
  onTranscriptChange: (
    updater: (prev: TranscriptWord[]) => TranscriptWord[]
  ) => void;
  onSeek: (time: number) => void;
  currentTime: number;
}

const PARAGRAPH_GAP_THRESHOLD = 1.5; // seconds of gap to start a new paragraph

function groupIntoParagraphs(transcript: TranscriptWord[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let currentWords: TranscriptWord[] = [];
  let startIndex = 0;

  for (let i = 0; i < transcript.length; i++) {
    const word = transcript[i];

    // Skip silences for paragraph grouping
    if (word.word.startsWith("[silence")) {
      continue;
    }

    if (currentWords.length > 0) {
      const lastWord = currentWords[currentWords.length - 1];
      const gap = word.start - lastWord.end;

      if (gap >= PARAGRAPH_GAP_THRESHOLD || currentWords.length >= 50) {
        paragraphs.push({
          id: paragraphs.length,
          words: currentWords,
          startIndex,
          endIndex: i - 1,
          isDeleted: currentWords.every((w) => w.isDeleted),
        });
        currentWords = [];
        startIndex = i;
      }
    } else {
      startIndex = i;
    }

    currentWords.push(word);
  }

  if (currentWords.length > 0) {
    paragraphs.push({
      id: paragraphs.length,
      words: currentWords,
      startIndex,
      endIndex: transcript.length - 1,
      isDeleted: currentWords.every((w) => w.isDeleted),
    });
  }

  return paragraphs;
}

function formatTs(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TextBasedEditor({
  transcript,
  onTranscriptChange,
  onSeek,
  currentTime,
}: TextBasedEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);

  const paragraphs = useMemo(
    () => groupIntoParagraphs(transcript),
    [transcript]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDragEnter = useCallback(
    (index: number) => {
      dragCounter.current++;
      if (index !== draggedIndex) {
        setDragOverIndex(index);
      }
    },
    [draggedIndex]
  );

  const handleDragLeave = useCallback(() => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      dragCounter.current = 0;
      setDragOverIndex(null);
      setDraggedIndex(null);

      if (draggedIndex === null || draggedIndex === dropIndex) return;

      // Reorder paragraphs and rebuild the transcript
      const reordered = [...paragraphs];
      const [moved] = reordered.splice(draggedIndex, 1);
      reordered.splice(dropIndex, 0, moved);

      // Rebuild transcript with reordered paragraphs
      onTranscriptChange(() => {
        const newTranscript: TranscriptWord[] = [];
        let currentTime = 0;

        for (const para of reordered) {
          const originalStart = para.words[0].start;

          for (const word of para.words) {
            const offsetFromParagraphStart = word.start - originalStart;
            const wordDuration = word.end - word.start;
            const newStart = currentTime + offsetFromParagraphStart;

            newTranscript.push({
              ...word,
              start: newStart,
              end: newStart + wordDuration,
            });
          }

          const lastWord = para.words[para.words.length - 1];
          const paragraphDuration = lastWord.end - originalStart;
          currentTime += paragraphDuration + 0.3; // small gap between paragraphs
        }

        // Re-insert silences between paragraphs where gaps exist
        const withSilences: TranscriptWord[] = [];
        for (let i = 0; i < newTranscript.length; i++) {
          withSilences.push(newTranscript[i]);

          if (i < newTranscript.length - 1) {
            const gap = newTranscript[i + 1].start - newTranscript[i].end;
            if (gap >= 1.5) {
              withSilences.push({
                word: `[silence ${gap.toFixed(1)}s]`,
                start: newTranscript[i].end,
                end: newTranscript[i + 1].start,
                isFiller: true,
                isDeleted: false,
              });
            }
          }
        }

        return withSilences;
      });
    },
    [draggedIndex, paragraphs, onTranscriptChange]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  }, []);

  const deleteParagraph = useCallback(
    (paraIndex: number) => {
      const para = paragraphs[paraIndex];
      const wordStarts = new Set(para.words.map((w) => w.start));
      onTranscriptChange((prev) =>
        prev.map((w) =>
          wordStarts.has(w.start) && !w.word.startsWith("[silence")
            ? { ...w, isDeleted: true }
            : w
        )
      );
    },
    [paragraphs, onTranscriptChange]
  );

  const restoreParagraph = useCallback(
    (paraIndex: number) => {
      const para = paragraphs[paraIndex];
      const wordStarts = new Set(para.words.map((w) => w.start));
      onTranscriptChange((prev) =>
        prev.map((w) =>
          wordStarts.has(w.start) && !w.word.startsWith("[silence")
            ? { ...w, isDeleted: false }
            : w
        )
      );
    },
    [paragraphs, onTranscriptChange]
  );

  if (paragraphs.length === 0) return null;

  return (
    <div data-testid="text-based-editor">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs text-text-muted">
          {paragraphs.length} paragraph{paragraphs.length > 1 ? "s" : ""} — drag
          to reorder, click to seek
        </span>
      </div>
      <div className="space-y-1">
        {paragraphs.map((para, index) => {
          const isActive = para.words.some(
            (w) => currentTime >= w.start && currentTime < w.end
          );
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <div
              key={`para-${para.startIndex}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDragEnter={() => handleDragEnter(index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`group relative rounded-lg border p-3 transition-all cursor-grab active:cursor-grabbing ${
                isDragging
                  ? "opacity-40 border-primary/50"
                  : isDragOver
                    ? "border-primary bg-primary/5 border-dashed"
                    : isActive
                      ? "border-primary/30 bg-primary/5"
                      : para.isDeleted
                        ? "border-surface-lighter/50 bg-surface/50 opacity-60"
                        : "border-surface-lighter bg-surface hover:border-surface-lighter/80"
              }`}
              data-testid={`paragraph-${index}`}
            >
              <div className="flex items-start gap-2">
                {/* Drag handle */}
                <span className="mt-0.5 shrink-0 text-text-muted/30 group-hover:text-text-muted select-none text-sm">
                  &#9776;
                </span>

                <div className="flex-1 min-w-0">
                  {/* Timestamp */}
                  <button
                    onClick={() => onSeek(para.words[0].start)}
                    className="mb-1 text-xs font-mono text-primary hover:text-primary-light tabular-nums"
                  >
                    {formatTs(para.words[0].start)} -{" "}
                    {formatTs(para.words[para.words.length - 1].end)}
                  </button>

                  {/* Text content */}
                  <p
                    className={`text-sm leading-relaxed ${
                      para.isDeleted
                        ? "text-deleted line-through"
                        : "text-text"
                    }`}
                  >
                    {para.words.map((w) => w.word).join(" ")}
                  </p>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {para.isDeleted ? (
                    <button
                      onClick={() => restoreParagraph(index)}
                      className="rounded bg-success/20 px-2 py-0.5 text-[10px] font-medium text-success hover:bg-success/30"
                      title="Restore paragraph"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => deleteParagraph(index)}
                      className="rounded bg-danger/20 px-2 py-0.5 text-[10px] font-medium text-danger hover:bg-danger/30"
                      title="Delete paragraph"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
