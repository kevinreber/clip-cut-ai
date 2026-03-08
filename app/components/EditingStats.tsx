import { useMemo } from "react";

type TranscriptWord = {
  word: string;
  start: number;
  end: number;
  isFiller: boolean;
  isDeleted: boolean;
  confidence?: number;
};

type EditingStatsProps = {
  transcript: TranscriptWord[];
  duration: number;
};

export function EditingStats({ transcript, duration }: EditingStatsProps) {
  const stats = useMemo(() => {
    const totalWords = transcript.filter(
      (w) => !w.word.startsWith("[silence")
    ).length;
    const deletedWords = transcript.filter((w) => w.isDeleted).length;
    const fillerWords = transcript.filter(
      (w) => w.isFiller && !w.word.startsWith("[silence")
    ).length;
    const silences = transcript.filter((w) =>
      w.word.startsWith("[silence")
    ).length;
    const deletedSilences = transcript.filter(
      (w) => w.word.startsWith("[silence") && w.isDeleted
    ).length;
    const deletedFillers = transcript.filter(
      (w) =>
        w.isFiller && !w.word.startsWith("[silence") && w.isDeleted
    ).length;

    // Compute time saved
    let timeSaved = 0;
    for (const word of transcript) {
      if (word.isDeleted) {
        timeSaved += word.end - word.start;
      }
    }

    const cleanDuration = duration - timeSaved;
    const percentReduction =
      duration > 0 ? ((timeSaved / duration) * 100).toFixed(1) : "0";

    return {
      totalWords,
      deletedWords,
      fillerWords,
      silences,
      deletedSilences,
      deletedFillers,
      timeSaved,
      cleanDuration,
      percentReduction,
    };
  }, [transcript, duration]);

  if (stats.deletedWords === 0) return null;

  return (
    <div
      className="mt-3 rounded-lg border border-success/20 bg-success/5 p-4"
      data-testid="editing-stats"
    >
      <h3 className="mb-2 text-sm font-medium text-success">
        Editing Summary
      </h3>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div>
          <div className="text-lg font-bold text-white">
            {stats.timeSaved.toFixed(1)}s
          </div>
          <div className="text-xs text-text-muted">Time saved</div>
        </div>
        <div>
          <div className="text-lg font-bold text-white">
            {stats.percentReduction}%
          </div>
          <div className="text-xs text-text-muted">Shorter</div>
        </div>
        <div>
          <div className="text-lg font-bold text-white">
            {stats.deletedFillers}
          </div>
          <div className="text-xs text-text-muted">Fillers removed</div>
        </div>
        <div>
          <div className="text-lg font-bold text-white">
            {stats.deletedSilences}
          </div>
          <div className="text-xs text-text-muted">Silences cut</div>
        </div>
      </div>
    </div>
  );
}
