import { useState, useCallback, useRef, useMemo } from "react";

interface Track {
  id: string;
  name: string;
  type: "video" | "audio" | "image" | "text";
  fileId?: string;
  start: number;
  end: number;
  layer: number;
  volume?: number;
  opacity?: number;
  text?: string;
}

interface MultiTrackTimelineProps {
  tracks: Track[] | undefined;
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  onTracksChange: (tracks: Track[]) => void;
}

const TRACK_COLORS: Record<string, string> = {
  video: "bg-blue-500/40 border-blue-500",
  audio: "bg-green-500/40 border-green-500",
  image: "bg-purple-500/40 border-purple-500",
  text: "bg-yellow-500/40 border-yellow-500",
};

const TRACK_ICONS: Record<string, string> = {
  video: "\u{1F3AC}",
  audio: "\u{1F3B5}",
  image: "\u{1F5BC}",
  text: "\u{1F4DD}",
};

function generateId(): string {
  return `track-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MultiTrackTimeline({
  tracks: tracksProp,
  duration,
  currentTime,
  onSeek,
  onTracksChange,
}: MultiTrackTimelineProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingTrack, setEditingTrack] = useState<string | null>(null);
  const [dragInfo, setDragInfo] = useState<{
    trackId: string;
    startX: number;
    originalStart: number;
    originalEnd: number;
  } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const tracks = tracksProp || [];

  const layers = useMemo(() => {
    const layerMap = new Map<number, Track[]>();
    for (const track of tracks) {
      const existing = layerMap.get(track.layer) || [];
      existing.push(track);
      layerMap.set(track.layer, existing);
    }
    // Sort layers
    return Array.from(layerMap.entries()).sort(([a], [b]) => a - b);
  }, [tracks]);

  const maxLayer = useMemo(
    () => (tracks.length > 0 ? Math.max(...tracks.map((t) => t.layer)) : 0),
    [tracks]
  );

  const handleAddTrack = useCallback(
    (type: Track["type"]) => {
      const newTrack: Track = {
        id: generateId(),
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${tracks.filter((t) => t.type === type).length + 1}`,
        type,
        start: 0,
        end: Math.min(duration, 10),
        layer: maxLayer + 1,
        volume: type === "audio" ? 1.0 : undefined,
        opacity: type === "image" || type === "text" ? 1.0 : undefined,
        text: type === "text" ? "Sample text overlay" : undefined,
      };
      onTracksChange([...tracks, newTrack]);
      setShowAddMenu(false);
    },
    [tracks, duration, maxLayer, onTracksChange]
  );

  const handleDeleteTrack = useCallback(
    (trackId: string) => {
      onTracksChange(tracks.filter((t) => t.id !== trackId));
      if (selectedTrack === trackId) setSelectedTrack(null);
      if (editingTrack === trackId) setEditingTrack(null);
    },
    [tracks, selectedTrack, editingTrack, onTracksChange]
  );

  const handleTrackMouseDown = useCallback(
    (e: React.MouseEvent, trackId: string) => {
      e.stopPropagation();
      const track = tracks.find((t) => t.id === trackId);
      if (!track) return;
      setSelectedTrack(trackId);
      setDragInfo({
        trackId,
        startX: e.clientX,
        originalStart: track.start,
        originalEnd: track.end,
      });
    },
    [tracks]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragInfo || !timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragInfo.startX;
      const deltaTime = (deltaX / rect.width) * duration;
      const trackDuration = dragInfo.originalEnd - dragInfo.originalStart;
      let newStart = Math.max(0, dragInfo.originalStart + deltaTime);
      let newEnd = newStart + trackDuration;
      if (newEnd > duration) {
        newEnd = duration;
        newStart = newEnd - trackDuration;
      }
      onTracksChange(
        tracks.map((t) =>
          t.id === dragInfo.trackId
            ? { ...t, start: Math.round(newStart * 10) / 10, end: Math.round(newEnd * 10) / 10 }
            : t
        )
      );
    },
    [dragInfo, duration, tracks, onTracksChange]
  );

  const handleMouseUp = useCallback(() => {
    setDragInfo(null);
  }, []);

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragInfo) return;
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect || duration === 0) return;
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(pct * duration);
    },
    [duration, onSeek, dragInfo]
  );

  const handleUpdateTrackProperty = useCallback(
    (trackId: string, key: keyof Track, value: any) => {
      onTracksChange(
        tracks.map((t) => (t.id === trackId ? { ...t, [key]: value } : t))
      );
    },
    [tracks, onTracksChange]
  );

  const selectedTrackData = tracks.find((t) => t.id === selectedTrack);

  return (
    <div className="mt-3 rounded-lg border border-surface-lighter bg-surface-light" data-testid="multi-track-timeline">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        data-testid="multi-track-toggle"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">Multi-Track Timeline</span>
          <span className="rounded-full bg-surface-lighter px-2 py-0.5 text-xs text-text-muted">
            {tracks.length} track{tracks.length !== 1 ? "s" : ""}
          </span>
        </div>
        <span className="text-text-muted">{expanded ? "\u25B2" : "\u25BC"}</span>
      </button>

      {expanded && (
        <div className="border-t border-surface-lighter px-4 pb-4">
          {/* Toolbar */}
          <div className="flex items-center gap-2 py-3">
            <div className="relative">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="rounded-md bg-primary/20 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/30"
                data-testid="add-track-btn"
              >
                + Add Track
              </button>
              {showAddMenu && (
                <div className="absolute left-0 top-full z-20 mt-1 rounded-md border border-surface-lighter bg-surface p-1 shadow-xl">
                  {(["video", "audio", "image", "text"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => handleAddTrack(type)}
                      className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-lighter hover:text-white"
                      data-testid={`add-track-${type}`}
                    >
                      <span>{TRACK_ICONS[type]}</span>
                      <span className="capitalize">{type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedTrack && (
              <button
                onClick={() => handleDeleteTrack(selectedTrack)}
                className="rounded-md bg-danger/20 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/30"
                data-testid="delete-track-btn"
              >
                Delete Track
              </button>
            )}
            <span className="ml-auto text-xs text-text-muted tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Timeline area */}
          <div
            ref={timelineRef}
            className="relative cursor-pointer select-none"
            onClick={handleTimelineClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            data-testid="multi-track-area"
          >
            {/* Time ruler */}
            <div className="relative h-6 border-b border-surface-lighter">
              {duration > 0 &&
                Array.from({ length: Math.min(Math.floor(duration / 5) + 1, 20) }).map((_, i) => {
                  const time = i * 5;
                  if (time > duration) return null;
                  return (
                    <div
                      key={i}
                      className="absolute top-0 h-full border-l border-white/10"
                      style={{ left: `${(time / duration) * 100}%` }}
                    >
                      <span className="absolute bottom-0.5 left-1 text-[9px] text-text-muted/60">
                        {formatTime(time)}
                      </span>
                    </div>
                  );
                })}
            </div>

            {/* Track layers */}
            {layers.length === 0 ? (
              <div className="flex h-16 items-center justify-center text-xs text-text-muted">
                No tracks yet. Click &quot;+ Add Track&quot; to add B-roll, audio, images, or text overlays.
              </div>
            ) : (
              layers.map(([layer, layerTracks]) => (
                <div key={layer} className="relative h-10 border-b border-surface-lighter/50">
                  {/* Layer label */}
                  <span className="absolute left-1 top-0.5 z-10 text-[9px] text-text-muted/40">
                    L{layer}
                  </span>
                  {/* Tracks on this layer */}
                  {layerTracks.map((track) => {
                    const leftPct = duration > 0 ? (track.start / duration) * 100 : 0;
                    const widthPct =
                      duration > 0 ? ((track.end - track.start) / duration) * 100 : 0;
                    const isSelected = selectedTrack === track.id;
                    return (
                      <div
                        key={track.id}
                        className={`absolute top-1 h-8 cursor-grab rounded border ${TRACK_COLORS[track.type]} ${
                          isSelected ? "ring-2 ring-white/50" : ""
                        } flex items-center gap-1 px-1.5 overflow-hidden`}
                        style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 1)}%` }}
                        onMouseDown={(e) => handleTrackMouseDown(e, track.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrack(track.id);
                        }}
                        title={`${track.name} (${formatTime(track.start)} - ${formatTime(track.end)})`}
                        data-testid={`track-${track.id}`}
                      >
                        <span className="text-xs">{TRACK_ICONS[track.type]}</span>
                        <span className="truncate text-[10px] text-white/80">
                          {track.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))
            )}

            {/* Playhead */}
            {duration > 0 && (
              <div
                className="absolute top-0 h-full w-0.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)] z-10 pointer-events-none"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              />
            )}
          </div>

          {/* Selected track properties */}
          {selectedTrackData && (
            <div
              className="mt-3 rounded-md border border-surface-lighter bg-surface p-3"
              data-testid="track-properties"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-white">
                  {TRACK_ICONS[selectedTrackData.type]} {selectedTrackData.name}
                </h4>
                <button
                  onClick={() => {
                    setEditingTrack(
                      editingTrack === selectedTrack ? null : selectedTrack
                    );
                  }}
                  className="text-xs text-primary hover:text-primary/80"
                >
                  {editingTrack === selectedTrack ? "Done" : "Edit"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-text-muted">Start</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max={duration}
                    value={selectedTrackData.start}
                    onChange={(e) =>
                      handleUpdateTrackProperty(
                        selectedTrackData.id,
                        "start",
                        Math.max(0, parseFloat(e.target.value) || 0)
                      )
                    }
                    className="mt-0.5 w-full rounded bg-surface-lighter px-2 py-1 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-text-muted">End</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max={duration}
                    value={selectedTrackData.end}
                    onChange={(e) =>
                      handleUpdateTrackProperty(
                        selectedTrackData.id,
                        "end",
                        Math.min(duration, parseFloat(e.target.value) || 0)
                      )
                    }
                    className="mt-0.5 w-full rounded bg-surface-lighter px-2 py-1 text-white outline-none"
                  />
                </div>
                {selectedTrackData.type === "audio" && (
                  <div className="col-span-2">
                    <label className="text-text-muted">
                      Volume: {((selectedTrackData.volume ?? 1) * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedTrackData.volume ?? 1}
                      onChange={(e) =>
                        handleUpdateTrackProperty(
                          selectedTrackData.id,
                          "volume",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full accent-primary"
                    />
                  </div>
                )}
                {(selectedTrackData.type === "image" ||
                  selectedTrackData.type === "text") && (
                  <div className="col-span-2">
                    <label className="text-text-muted">
                      Opacity: {((selectedTrackData.opacity ?? 1) * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedTrackData.opacity ?? 1}
                      onChange={(e) =>
                        handleUpdateTrackProperty(
                          selectedTrackData.id,
                          "opacity",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full accent-primary"
                    />
                  </div>
                )}
                {selectedTrackData.type === "text" && editingTrack === selectedTrack && (
                  <div className="col-span-2">
                    <label className="text-text-muted">Text</label>
                    <input
                      type="text"
                      value={selectedTrackData.text || ""}
                      onChange={(e) =>
                        handleUpdateTrackProperty(
                          selectedTrackData.id,
                          "text",
                          e.target.value
                        )
                      }
                      className="mt-0.5 w-full rounded bg-surface-lighter px-2 py-1 text-white outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
            {(["video", "audio", "image", "text"] as const).map((type) => (
              <div key={type} className="flex items-center gap-1">
                <span
                  className={`inline-block h-2.5 w-4 rounded-sm border ${TRACK_COLORS[type]}`}
                />
                <span className="capitalize">{type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
