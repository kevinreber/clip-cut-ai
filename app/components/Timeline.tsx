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

      {/* Timeline track */}
      <div
        ref={trackRef}
        onClick={handleClick}
        className="relative h-10 cursor-pointer rounded-md bg-surface overflow-hidden"
      >
        {/* Kept segments (green) */}
        {segments.map((seg, i) => (
          <div
            key={`kept-${i}`}
            className="absolute top-0 h-full bg-success/40"
            style={{
              left: `${(seg.start / duration) * 100}%`,
              width: `${((seg.end - seg.start) / duration) * 100}%`,
            }}
          />
        ))}

        {/* Deleted segments (red striped) */}
        {deletedSegments.map((seg, i) => (
          <div
            key={`del-${i}`}
            className="absolute top-0 h-full bg-deleted/20"
            style={{
              left: `${(seg.start / duration) * 100}%`,
              width: `${((seg.end - seg.start) / duration) * 100}%`,
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(248,113,113,0.15) 3px, rgba(248,113,113,0.15) 6px)",
            }}
          />
        ))}

        {/* Playhead */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.5)]"
          style={{ left: `${playheadPct}%` }}
        />

        {/* Time markers */}
        {Array.from({ length: Math.min(Math.floor(duration / 10) + 1, 20) }).map((_, i) => {
          const time = i * Math.ceil(duration / 10 / (Math.min(Math.floor(duration / 10) + 1, 20) - 1)) * 10;
          if (time > duration) return null;
          return (
            <div
              key={`marker-${i}`}
              className="absolute top-0 h-full border-l border-white/10"
              style={{ left: `${(time / duration) * 100}%` }}
            >
              <span className="absolute bottom-0.5 left-1 text-[10px] text-text-muted">
                {formatTime(time)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-2 flex gap-4 text-xs text-text-muted">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm bg-success/40" />
          Kept
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm bg-deleted/20" />
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
