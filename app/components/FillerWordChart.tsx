import { useMemo } from "react";

type TranscriptWord = {
  word: string;
  start: number;
  end: number;
  isFiller: boolean;
  isDeleted: boolean;
  confidence?: number;
};

type FillerWordChartProps = {
  transcript: TranscriptWord[];
};

export function FillerWordChart({ transcript }: FillerWordChartProps) {
  const fillerFrequency = useMemo(() => {
    const freq: Record<string, number> = {};
    for (const word of transcript) {
      if (!word.isFiller) continue;
      if (word.word.startsWith("[silence")) {
        freq["[silence]"] = (freq["[silence]"] || 0) + 1;
      } else if (word.word.startsWith("[rep:")) {
        freq["[repetition]"] = (freq["[repetition]"] || 0) + 1;
      } else {
        const normalized = word.word.toLowerCase().trim();
        freq[normalized] = (freq[normalized] || 0) + 1;
      }
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [transcript]);

  if (fillerFrequency.length === 0) return null;

  const maxCount = fillerFrequency[0][1];

  return (
    <div className="mt-3 rounded-lg bg-surface-light p-4" data-testid="filler-chart">
      <h3 className="mb-3 text-sm font-medium text-white">
        Filler Word Frequency
      </h3>
      <div className="space-y-2">
        {fillerFrequency.map(([word, count]) => (
          <div key={word} className="flex items-center gap-2">
            <span className="w-24 truncate text-xs text-text-muted">
              {word}
            </span>
            <div className="flex-1">
              <div
                className="h-4 rounded-sm bg-filler/40 transition-all"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right text-xs font-medium text-filler">
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
