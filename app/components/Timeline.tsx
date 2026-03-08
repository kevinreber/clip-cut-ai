import { useCallback, useRef, useMemo } from "react";
import { computeKeptSegments } from "../lib/video-export";

type TranscriptWord = {
  word: string;
  start: number;
  end: number;
  isFiller: boolean;
  isDeleted: boolean;
};

type TimelineProps = {
  transcript: TranscriptWord[];
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
};

export function Timeline({
  transcript,
  duration,
  currentTime,
  onSeek,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const segments = useMemo(
    () => computeKeptSegments(transcript, duration),
    [transcript, duration]
  );

  const deletedSegments = useMemo(() => {
    if (transcript.length === 0 || duration === 0) return [];
    const kept = segments;
    const deleted: { start: number; end: number }[] = [];

    let cursor = 0;
    for (const seg of kept) {
      if (seg.start > cursor + 0.01) {
        deleted.push({ start: cursor, end: seg.start });
      }
      cursor = seg.end;
    }
    if (cursor < duration - 0.01) {
      deleted.push({ start: cursor, end: duration });
    }
    return deleted;
  }, [segments, duration, transcript]);

  const totalKeptDuration = useMemo(
    () => segments.reduce((sum, s) => sum + (s.end - s.start), 0),
    [segments]
  );

  // Compute waveform-like bars based on word density per time bucket
  const waveformBars = useMemo(() => {
    if (transcript.length === 0 || duration === 0) return [];
    const numBars = 100;
    const bucketSize = duration / numBars;
    const bars: number[] = new Array(numBars).fill(0);

    for (const word of transcript) {
      if (word.word.startsWith("[silence")) continue;
      const bucket = Math.min(Math.floor(word.start / bucketSize), numBars - 1);
      bars[bucket]++;
    }

    const maxVal = Math.max(...bars, 1);
    return bars.map((v) => v / maxVal);
  }, [transcript, duration]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const track = trackRef.current;
      if (!track || duration === 0) return;
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(pct * duration);
    },
    [duration, onSeek]
  );

  if (duration === 0) return null;

  const playheadPct = (currentTime / duration) * 100;

  // Simplified time markers
  const markerInterval = duration <= 30 ? 5 : duration <= 120 ? 10 : duration <= 600 ? 30 : 60;
  const markerCount = Math.floor(duration / markerInterval);

  return (
    <div className="mt-4 rounded-lg bg-surface-light p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Timeline</h3>
        <div className="flex gap-4 text-xs text-text-muted">
          <span>
            Kept:{" "}
            <span className="text-success font-medium">
              {totalKeptDuration.toFixed(1)}s
            </span>
          </span>
          <span>
            Cut:{" "}
            <span className="text-deleted font-medium">
              {(duration - totalKeptDuration).toFixed(1)}s
            </span>
          </span>
          <span>
            Total:{" "}
            <span className="text-white font-medium">
              {duration.toFixed(1)}s
            </span>
          </span>
        </div>
      </div>

      {/* Waveform visualization */}
      <div
        ref={trackRef}
        onClick={handleClick}
        className="relative h-16 cursor-pointer rounded-md bg-surface overflow-hidden"
      >
        {/* Waveform bars */}
        <div className="absolute inset-0 flex items-end">
          {waveformBars.map((amplitude, i) => {
            const barPct = 100 / waveformBars.length;
            const barTime = (i / waveformBars.length) * duration;
            const isDeleted = deletedSegments.some(
              (s) => barTime >= s.start && barTime < s.end
            );
            return (
              <div
                key={i}
                className="flex-1"
                style={{ height: "100%", display: "flex", alignItems: "flex-end" }}
              >
                <div
                  className={`w-full ${isDeleted ? "bg-deleted/40" : "bg-success/50"}`}
                  style={{
                    height: `${Math.max(8, amplitude * 100)}%`,
                    transition: "height 0.15s ease",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Kept segments overlay (subtle) */}
        {segments.map((seg, i) => (
          <div
            key={`kept-${i}`}
            className="absolute top-0 h-full bg-success/10"
            style={{
              left: `${(seg.start / duration) * 100}%`,
              width: `${((seg.end - seg.start) / duration) * 100}%`,
            }}
          />
        ))}

        {/* Deleted segments overlay */}
        {deletedSegments.map((seg, i) => (
          <div
            key={`del-${i}`}
            className="absolute top-0 h-full"
            style={{
              left: `${(seg.start / duration) * 100}%`,
              width: `${((seg.end - seg.start) / duration) * 100}%`,
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(248,113,113,0.1) 3px, rgba(248,113,113,0.1) 6px)",
            }}
          />
        ))}

        {/* Playhead */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)] z-10"
          style={{ left: `${playheadPct}%` }}
        />

        {/* Time markers */}
        {Array.from({ length: markerCount + 1 }).map((_, i) => {
          const time = i * markerInterval;
          if (time > duration || time === 0) return null;
          return (
            <div
              key={`marker-${i}`}
              className="absolute top-0 h-full border-l border-white/10"
              style={{ left: `${(time / duration) * 100}%` }}
            >
              <span className="absolute top-0.5 left-1 text-[10px] text-text-muted/60">
                {formatTime(time)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-2 flex gap-4 text-xs text-text-muted">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm bg-success/50" />
          Kept
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm bg-deleted/40" />
          Cut
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
