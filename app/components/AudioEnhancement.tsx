import { useState, useCallback, useRef, useEffect } from "react";

type Preset = "clean-podcast" | "reduce-noise" | "normalize-volume" | "custom";

interface AudioSettings {
  noiseGate: number; // threshold in dB (-100 to 0)
  compression: number; // ratio (1 to 20)
  eqLow: number; // low shelf gain in dB (-12 to 12)
  eqMid: number; // mid peak gain in dB (-12 to 12)
  eqHigh: number; // high shelf gain in dB (-12 to 12)
  normalize: boolean;
}

const PRESETS: Record<Exclude<Preset, "custom">, { label: string; description: string; settings: AudioSettings }> = {
  "clean-podcast": {
    label: "Clean Podcast",
    description: "Reduces room noise and evens out volume levels for a polished podcast sound",
    settings: {
      noiseGate: -50,
      compression: 4,
      eqLow: -3,
      eqMid: 2,
      eqHigh: 1,
      normalize: true,
    },
  },
  "reduce-noise": {
    label: "Reduce Background Noise",
    description: "Aggressively gates out low-level background noise like fans, AC, or hum",
    settings: {
      noiseGate: -40,
      compression: 2,
      eqLow: -6,
      eqMid: 0,
      eqHigh: 0,
      normalize: false,
    },
  },
  "normalize-volume": {
    label: "Normalize Volume",
    description: "Evens out loud and quiet sections for consistent listening volume",
    settings: {
      noiseGate: -60,
      compression: 8,
      eqLow: 0,
      eqMid: 0,
      eqHigh: 0,
      normalize: true,
    },
  },
};

interface AudioEnhancementProps {
  videoUrl: string | null | undefined;
  onEnhancedAudio: (audioBuffer: AudioBuffer | null) => void;
}

export function AudioEnhancement({ videoUrl, onEnhancedAudio }: AudioEnhancementProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<Preset>("clean-podcast");
  const [customSettings, setCustomSettings] = useState<AudioSettings>(PRESETS["clean-podcast"].settings);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  const currentSettings = selectedPreset === "custom"
    ? customSettings
    : PRESETS[selectedPreset].settings;

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const processAudio = useCallback(async () => {
    if (!videoUrl) return;
    setIsProcessing(true);
    setProgress(0);

    try {
      // Fetch the video/audio file
      setProgress(10);
      const response = await fetch(videoUrl);
      const arrayBuffer = await response.arrayBuffer();

      setProgress(30);

      // Decode audio
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      setProgress(50);

      // Create offline context for processing
      const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );

      // Source
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;

      // Chain: source -> noiseGate -> EQ -> compressor -> gain (normalize) -> destination
      let lastNode: AudioNode = source;

      // 1. Noise Gate (simulated with dynamics compressor at extreme settings)
      const noiseGateThreshold = currentSettings.noiseGate;
      if (noiseGateThreshold > -100) {
        const gate = offlineCtx.createDynamicsCompressor();
        gate.threshold.value = noiseGateThreshold;
        gate.knee.value = 1;
        gate.ratio.value = 20; // Very high ratio acts as a gate
        gate.attack.value = 0.001;
        gate.release.value = 0.05;
        lastNode.connect(gate);
        lastNode = gate;
      }

      setProgress(60);

      // 2. EQ (3-band)
      if (currentSettings.eqLow !== 0) {
        const lowShelf = offlineCtx.createBiquadFilter();
        lowShelf.type = "lowshelf";
        lowShelf.frequency.value = 300;
        lowShelf.gain.value = currentSettings.eqLow;
        lastNode.connect(lowShelf);
        lastNode = lowShelf;
      }

      if (currentSettings.eqMid !== 0) {
        const midPeak = offlineCtx.createBiquadFilter();
        midPeak.type = "peaking";
        midPeak.frequency.value = 1500;
        midPeak.Q.value = 1;
        midPeak.gain.value = currentSettings.eqMid;
        lastNode.connect(midPeak);
        lastNode = midPeak;
      }

      if (currentSettings.eqHigh !== 0) {
        const highShelf = offlineCtx.createBiquadFilter();
        highShelf.type = "highshelf";
        highShelf.frequency.value = 4000;
        highShelf.gain.value = currentSettings.eqHigh;
        lastNode.connect(highShelf);
        lastNode = highShelf;
      }

      setProgress(70);

      // 3. Compressor
      if (currentSettings.compression > 1) {
        const compressor = offlineCtx.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 10;
        compressor.ratio.value = currentSettings.compression;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;
        lastNode.connect(compressor);
        lastNode = compressor;
      }

      // 4. Normalize (gain boost)
      if (currentSettings.normalize) {
        const gainNode = offlineCtx.createGain();
        gainNode.gain.value = 1.5;
        lastNode.connect(gainNode);
        lastNode = gainNode;
      }

      lastNode.connect(offlineCtx.destination);
      source.start(0);

      setProgress(80);

      const renderedBuffer = await offlineCtx.startRendering();

      setProgress(100);
      setIsActive(true);
      onEnhancedAudio(renderedBuffer);
    } catch (err) {
      console.error("Audio enhancement failed:", err);
      setIsActive(false);
      onEnhancedAudio(null);
    } finally {
      setIsProcessing(false);
    }
  }, [videoUrl, currentSettings, onEnhancedAudio]);

  const handleDisable = useCallback(() => {
    setIsActive(false);
    onEnhancedAudio(null);
  }, [onEnhancedAudio]);

  const handlePresetChange = (preset: Preset) => {
    setSelectedPreset(preset);
    if (preset !== "custom") {
      setCustomSettings(PRESETS[preset].settings);
    }
  };

  const handleSettingChange = (key: keyof AudioSettings, value: number | boolean) => {
    setSelectedPreset("custom");
    setCustomSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div
      className="mt-3 rounded-lg border border-surface-lighter bg-surface-light"
      data-testid="audio-enhancement"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-white">
          Audio Enhancement
          {isActive && (
            <span className="ml-1.5 text-xs font-normal text-success">
              (Active)
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="rounded-md bg-surface-lighter px-2 py-0.5 text-xs text-text-muted transition-colors hover:text-white"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
          {isActive && (
            <button
              onClick={handleDisable}
              className="rounded-md bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30"
            >
              Disable
            </button>
          )}
          <button
            onClick={processAudio}
            disabled={isProcessing || !videoUrl}
            className="rounded-md bg-primary/20 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/30 disabled:opacity-50"
            data-testid="enhance-audio-btn"
          >
            {isProcessing
              ? "Processing..."
              : isActive
                ? "Re-process"
                : "Enhance Audio"}
          </button>
        </div>
      </div>

      {isProcessing && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
            <span className="animate-spin">&#9881;</span>
            Processing audio with Web Audio API...
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-lighter">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {expanded && !isProcessing && (
        <div className="border-t border-surface-lighter px-4 py-3 space-y-3">
          {/* Presets */}
          <div>
            <span className="text-xs font-medium text-text-muted block mb-2">
              Preset
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.entries(PRESETS) as [Exclude<Preset, "custom">, typeof PRESETS["clean-podcast"]][]).map(
                ([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => handlePresetChange(key)}
                    className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                      selectedPreset === key
                        ? "border-primary bg-primary/10 text-white"
                        : "border-surface-lighter bg-surface text-text-muted hover:border-primary/40 hover:text-text"
                    }`}
                  >
                    <span className="text-xs font-medium block">
                      {preset.label}
                    </span>
                    <span className="text-[10px] text-text-muted mt-0.5 block leading-snug">
                      {preset.description}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Advanced controls */}
          <details className="group">
            <summary className="text-xs font-medium text-text-muted cursor-pointer hover:text-text select-none">
              Advanced Settings {selectedPreset === "custom" && <span className="text-primary">(Custom)</span>}
            </summary>
            <div className="mt-3 space-y-3">
              <SliderControl
                label="Noise Gate Threshold"
                value={currentSettings.noiseGate}
                min={-100}
                max={0}
                step={1}
                unit="dB"
                onChange={(v) => handleSettingChange("noiseGate", v)}
              />
              <SliderControl
                label="Compression Ratio"
                value={currentSettings.compression}
                min={1}
                max={20}
                step={0.5}
                unit=":1"
                onChange={(v) => handleSettingChange("compression", v)}
              />
              <SliderControl
                label="EQ Low (300Hz)"
                value={currentSettings.eqLow}
                min={-12}
                max={12}
                step={0.5}
                unit="dB"
                onChange={(v) => handleSettingChange("eqLow", v)}
              />
              <SliderControl
                label="EQ Mid (1.5kHz)"
                value={currentSettings.eqMid}
                min={-12}
                max={12}
                step={0.5}
                unit="dB"
                onChange={(v) => handleSettingChange("eqMid", v)}
              />
              <SliderControl
                label="EQ High (4kHz)"
                value={currentSettings.eqHigh}
                min={-12}
                max={12}
                step={0.5}
                unit="dB"
                onChange={(v) => handleSettingChange("eqHigh", v)}
              />
              <label className="flex items-center gap-2 text-xs text-text">
                <input
                  type="checkbox"
                  checked={currentSettings.normalize}
                  onChange={(e) => handleSettingChange("normalize", e.target.checked)}
                  className="rounded border-surface-lighter"
                />
                Volume Normalization
              </label>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-muted">{label}</span>
        <span className="text-xs text-text font-mono tabular-nums">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-surface-lighter cursor-pointer accent-primary"
      />
    </div>
  );
}
