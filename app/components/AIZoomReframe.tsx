import { useState, useCallback, useRef, useEffect } from "react";

interface ZoomRegion {
  id: string;
  start: number;
  end: number;
  type: "zoom-in" | "zoom-out" | "pan" | "ken-burns";
  fromX: number;
  fromY: number;
  fromScale: number;
  toX: number;
  toY: number;
  toScale: number;
  aspectRatio?: string;
}

interface AIZoomReframeProps {
  zoomRegions: ZoomRegion[] | undefined;
  duration: number;
  currentTime: number;
  videoUrl: string | null | undefined;
  onGenerate: () => Promise<void>;
  isGenerating: boolean;
  onUpdateRegions: (regions: ZoomRegion[]) => void;
  onSeek: (time: number) => void;
}

const ZOOM_TYPES: { id: ZoomRegion["type"]; name: string; icon: string; description: string }[] = [
  { id: "zoom-in", name: "Zoom In", icon: "\u{1F50D}", description: "Focus on key moment" },
  { id: "zoom-out", name: "Zoom Out", icon: "\u{1F30D}", description: "Reveal wider context" },
  { id: "pan", name: "Pan", icon: "\u2194\uFE0F", description: "Smooth horizontal pan" },
  { id: "ken-burns", name: "Ken Burns", icon: "\u{1F3AC}", description: "Slow zoom + pan combo" },
];

const ASPECT_RATIOS = [
  { id: "16:9", name: "16:9", description: "Landscape (YouTube)" },
  { id: "9:16", name: "9:16", description: "Portrait (TikTok/Reels)" },
  { id: "1:1", name: "1:1", description: "Square (Instagram)" },
  { id: "4:5", name: "4:5", description: "Portrait (Instagram)" },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function generateId(): string {
  return `zoom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function AIZoomReframe({
  zoomRegions: regionsProp,
  duration,
  currentTime,
  videoUrl,
  onGenerate,
  isGenerating,
  onUpdateRegions,
  onSeek,
}: AIZoomReframeProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [targetAspectRatio, setTargetAspectRatio] = useState("9:16");
  const [showPreview, setShowPreview] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const regions = regionsProp || [];

  const handleAddRegion = useCallback(() => {
    const newRegion: ZoomRegion = {
      id: generateId(),
      start: Math.max(0, currentTime),
      end: Math.min(duration, currentTime + 5),
      type: "zoom-in",
      fromX: 0.5,
      fromY: 0.5,
      fromScale: 1.0,
      toX: 0.5,
      toY: 0.4,
      toScale: 1.4,
      aspectRatio: targetAspectRatio,
    };
    onUpdateRegions([...regions, newRegion].sort((a, b) => a.start - b.start));
    setSelectedRegion(newRegion.id);
  }, [currentTime, duration, targetAspectRatio, regions, onUpdateRegions]);

  const handleDeleteRegion = useCallback(
    (regionId: string) => {
      onUpdateRegions(regions.filter((r) => r.id !== regionId));
      if (selectedRegion === regionId) setSelectedRegion(null);
    },
    [regions, selectedRegion, onUpdateRegions]
  );

  const handleUpdateRegion = useCallback(
    (regionId: string, updates: Partial<ZoomRegion>) => {
      onUpdateRegions(
        regions.map((r) => (r.id === regionId ? { ...r, ...updates } : r))
      );
    },
    [regions, onUpdateRegions]
  );

  const handleApplyPreset = useCallback(
    (regionId: string, type: ZoomRegion["type"]) => {
      const presets: Record<string, Partial<ZoomRegion>> = {
        "zoom-in": { fromScale: 1.0, toScale: 1.4, fromX: 0.5, fromY: 0.5, toX: 0.5, toY: 0.4 },
        "zoom-out": { fromScale: 1.4, toScale: 1.0, fromX: 0.5, fromY: 0.4, toX: 0.5, toY: 0.5 },
        "pan": { fromScale: 1.2, toScale: 1.2, fromX: 0.3, fromY: 0.5, toX: 0.7, toY: 0.5 },
        "ken-burns": { fromScale: 1.0, toScale: 1.3, fromX: 0.3, fromY: 0.3, toX: 0.7, toY: 0.6 },
      };
      handleUpdateRegion(regionId, { type, ...presets[type] });
    },
    [handleUpdateRegion]
  );

  // Live preview rendering
  useEffect(() => {
    if (!showPreview || !previewCanvasRef.current || !videoPreviewRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const video = videoPreviewRef.current;
    if (!ctx) return;

    let animationFrame: number;

    const render = () => {
      const activeRegion = regions.find(
        (r) => currentTime >= r.start && currentTime <= r.end
      );

      // Determine canvas size from aspect ratio
      const [aw, ah] = (targetAspectRatio || "16:9").split(":").map(Number);
      const maxWidth = 320;
      const canvasWidth = maxWidth;
      const canvasHeight = Math.round(maxWidth * (ah / aw));
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      if (activeRegion) {
        const t = (currentTime - activeRegion.start) / (activeRegion.end - activeRegion.start);
        const clampedT = Math.max(0, Math.min(1, t));
        const easedT = clampedT * clampedT * (3 - 2 * clampedT); // smoothstep

        const cx = lerp(activeRegion.fromX, activeRegion.toX, easedT);
        const cy = lerp(activeRegion.fromY, activeRegion.toY, easedT);
        const scale = lerp(activeRegion.fromScale, activeRegion.toScale, easedT);

        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 360;

        // Calculate source rect based on zoom
        const srcW = vw / scale;
        const srcH = vh / scale;
        const srcX = cx * vw - srcW / 2;
        const srcY = cy * vh - srcH / 2;

        ctx.drawImage(
          video,
          Math.max(0, srcX),
          Math.max(0, srcY),
          srcW,
          srcH,
          0,
          0,
          canvasWidth,
          canvasHeight
        );
      } else {
        // No active region: draw normal
        ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
      }

      animationFrame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrame);
  }, [showPreview, regions, currentTime, targetAspectRatio]);

  const selectedRegionData = regions.find((r) => r.id === selectedRegion);
  const activeRegion = regions.find(
    (r) => currentTime >= r.start && currentTime <= r.end
  );

  return (
    <div className="mt-3 rounded-lg border border-surface-lighter bg-surface-light" data-testid="ai-zoom-reframe">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        data-testid="ai-zoom-reframe-toggle"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">AI Zoom / Reframe</span>
          <span className="rounded-full bg-surface-lighter px-2 py-0.5 text-xs text-text-muted">
            {regions.length} region{regions.length !== 1 ? "s" : ""}
          </span>
          {activeRegion && (
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary animate-pulse">
              Active
            </span>
          )}
        </div>
        <span className="text-text-muted">{expanded ? "\u25B2" : "\u25BC"}</span>
      </button>

      {expanded && (
        <div className="border-t border-surface-lighter px-4 pb-4 pt-3">
          <p className="mb-3 text-xs text-text-muted">
            Add dynamic zoom, pan, and Ken Burns effects. AI can auto-detect the best moments, or add them manually. Perfect for converting landscape video to portrait for social media.
          </p>

          {/* Aspect ratio selector */}
          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-text-muted">Target Aspect Ratio</label>
            <div className="flex gap-1.5" data-testid="aspect-ratio-selector">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.id}
                  onClick={() => setTargetAspectRatio(ratio.id)}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                    targetAspectRatio === ratio.id
                      ? "bg-primary text-white"
                      : "bg-surface-lighter text-text-muted hover:text-white"
                  }`}
                  title={ratio.description}
                  data-testid={`aspect-${ratio.id.replace(":", "-")}`}
                >
                  {ratio.name}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/80 disabled:opacity-50"
              data-testid="auto-detect-zoom-btn"
            >
              {isGenerating ? "Detecting..." : "AI Auto-Detect"}
            </button>
            <button
              onClick={handleAddRegion}
              className="rounded-md bg-surface-lighter px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-white"
              data-testid="add-zoom-region-btn"
            >
              + Manual Region
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                showPreview
                  ? "bg-success/20 text-success"
                  : "bg-surface-lighter text-text-muted hover:text-white"
              }`}
              data-testid="toggle-zoom-preview"
            >
              {showPreview ? "Hide Preview" : "Live Preview"}
            </button>
          </div>

          {/* Live Preview */}
          {showPreview && videoUrl && (
            <div className="mb-3 flex justify-center" data-testid="zoom-preview">
              <div className="relative rounded-lg overflow-hidden border border-surface-lighter bg-black">
                <canvas
                  ref={previewCanvasRef}
                  className="block"
                  style={{ maxWidth: "320px" }}
                />
                <video
                  ref={videoPreviewRef}
                  src={videoUrl}
                  className="hidden"
                  crossOrigin="anonymous"
                  muted
                />
                {activeRegion && (
                  <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                    {ZOOM_TYPES.find((z) => z.id === activeRegion.type)?.icon}{" "}
                    {ZOOM_TYPES.find((z) => z.id === activeRegion.type)?.name}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline visualization of zoom regions */}
          {regions.length > 0 && duration > 0 && (
            <div className="mb-3">
              <div className="relative h-8 rounded-md bg-surface overflow-hidden" data-testid="zoom-timeline">
                {regions.map((region) => {
                  const leftPct = (region.start / duration) * 100;
                  const widthPct = ((region.end - region.start) / duration) * 100;
                  const isActive = activeRegion?.id === region.id;
                  const isSelected = selectedRegion === region.id;
                  const typeColor = {
                    "zoom-in": "bg-blue-500/40 border-blue-500",
                    "zoom-out": "bg-orange-500/40 border-orange-500",
                    "pan": "bg-purple-500/40 border-purple-500",
                    "ken-burns": "bg-emerald-500/40 border-emerald-500",
                  }[region.type];
                  return (
                    <div
                      key={region.id}
                      className={`absolute top-1 h-6 cursor-pointer rounded border ${typeColor} ${
                        isSelected ? "ring-2 ring-white/50" : ""
                      } ${isActive ? "animate-pulse" : ""} flex items-center px-1`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${Math.max(widthPct, 1)}%`,
                      }}
                      onClick={() => {
                        setSelectedRegion(region.id);
                        onSeek(region.start);
                      }}
                      title={`${ZOOM_TYPES.find((z) => z.id === region.type)?.name}: ${formatTime(region.start)}-${formatTime(region.end)}`}
                    >
                      <span className="text-[10px] truncate text-white/80">
                        {ZOOM_TYPES.find((z) => z.id === region.type)?.icon}
                      </span>
                    </div>
                  );
                })}
                {/* Playhead */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.6)] z-10 pointer-events-none"
                  style={{ left: `${(currentTime / duration) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Region list */}
          {regions.length > 0 && (
            <div className="space-y-2" data-testid="zoom-regions-list">
              {regions.map((region) => (
                <div
                  key={region.id}
                  className={`rounded-md border p-2.5 cursor-pointer transition-colors ${
                    selectedRegion === region.id
                      ? "border-primary bg-primary/5"
                      : "border-surface-lighter bg-surface"
                  }`}
                  onClick={() => setSelectedRegion(region.id)}
                  data-testid={`zoom-region-${region.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {ZOOM_TYPES.find((z) => z.id === region.type)?.icon}
                      </span>
                      <span className="text-xs font-medium text-white">
                        {ZOOM_TYPES.find((z) => z.id === region.type)?.name}
                      </span>
                      <span className="text-[10px] text-text-muted tabular-nums">
                        {formatTime(region.start)} - {formatTime(region.end)}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        ({(region.end - region.start).toFixed(1)}s)
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeek(region.start);
                        }}
                        className="rounded bg-surface-lighter px-1.5 py-0.5 text-[10px] text-text-muted hover:text-white"
                        title="Jump to start"
                      >
                        &#9654;
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRegion(region.id);
                        }}
                        className="rounded bg-danger/20 px-1.5 py-0.5 text-[10px] text-danger hover:bg-danger/30"
                        title="Delete"
                      >
                        &#10005;
                      </button>
                    </div>
                  </div>

                  {/* Expanded editor for selected region */}
                  {selectedRegion === region.id && (
                    <div className="mt-2 space-y-2 border-t border-surface-lighter pt-2">
                      {/* Type selector */}
                      <div>
                        <label className="text-[10px] text-text-muted">Effect Type</label>
                        <div className="mt-0.5 flex gap-1">
                          {ZOOM_TYPES.map((zt) => (
                            <button
                              key={zt.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplyPreset(region.id, zt.id);
                              }}
                              className={`rounded px-2 py-0.5 text-[10px] transition-colors ${
                                region.type === zt.id
                                  ? "bg-primary text-white"
                                  : "bg-surface-lighter text-text-muted hover:text-white"
                              }`}
                            >
                              {zt.icon} {zt.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Timing */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-text-muted">Start (s)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max={duration}
                            value={region.start}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              handleUpdateRegion(region.id, {
                                start: Math.max(0, parseFloat(e.target.value) || 0),
                              })
                            }
                            className="mt-0.5 w-full rounded bg-surface-lighter px-2 py-0.5 text-[11px] text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-text-muted">End (s)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max={duration}
                            value={region.end}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              handleUpdateRegion(region.id, {
                                end: Math.min(duration, parseFloat(e.target.value) || 0),
                              })
                            }
                            className="mt-0.5 w-full rounded bg-surface-lighter px-2 py-0.5 text-[11px] text-white outline-none"
                          />
                        </div>
                      </div>

                      {/* Scale controls */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-text-muted">
                            From Scale: {region.fromScale.toFixed(1)}x
                          </label>
                          <input
                            type="range"
                            min="0.5"
                            max="3.0"
                            step="0.1"
                            value={region.fromScale}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              handleUpdateRegion(region.id, {
                                fromScale: parseFloat(e.target.value),
                              })
                            }
                            className="w-full accent-primary"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-text-muted">
                            To Scale: {region.toScale.toFixed(1)}x
                          </label>
                          <input
                            type="range"
                            min="0.5"
                            max="3.0"
                            step="0.1"
                            value={region.toScale}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              handleUpdateRegion(region.id, {
                                toScale: parseFloat(e.target.value),
                              })
                            }
                            className="w-full accent-primary"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {regions.length === 0 && (
            <p className="text-xs text-text-muted/60 text-center py-2">
              No zoom regions yet. Use AI Auto-Detect or add regions manually.
            </p>
          )}

          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-muted">
            {ZOOM_TYPES.map((zt) => (
              <div key={zt.id} className="flex items-center gap-1">
                <span>{zt.icon}</span>
                <span>{zt.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
