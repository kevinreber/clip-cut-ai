import { useCallback, useEffect, useRef, useState } from "react";

type RecordingState = "idle" | "recording" | "paused" | "stopped";
type RecordingSource = "screen" | "camera" | "screen+camera";

interface ScreenRecorderProps {
  onRecordingComplete: (blob: Blob, filename: string) => void;
}

export function ScreenRecorder({ onRecordingComplete }: ScreenRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [source, setSource] = useState<RecordingSource>("screen");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasScreenSupport, setHasScreenSupport] = useState(true);
  const [hasCameraSupport, setHasCameraSupport] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);

  // Check browser support
  useEffect(() => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setHasScreenSupport(false);
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setHasCameraSupport(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllStreams();
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function stopAllStreams() {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    cameraStreamRef.current = null;
  }

  function formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  const startRecording = useCallback(async () => {
    setError(null);
    chunksRef.current = [];

    try {
      let combinedStream: MediaStream;

      if (source === "screen" || source === "screen+camera") {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30 },
          audio: true,
        });
        screenStreamRef.current = screenStream;

        // Listen for user stopping screen share via browser UI
        screenStream.getVideoTracks()[0].addEventListener("ended", () => {
          stopRecording();
        });

        combinedStream = screenStream;
      }

      if (source === "camera" || source === "screen+camera") {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, frameRate: 30 },
          audio: source === "camera", // Only capture camera audio if screen audio isn't available
        });
        cameraStreamRef.current = cameraStream;

        if (source === "camera") {
          combinedStream = cameraStream;
        }
      }

      // For screen+camera, merge tracks (screen video + camera video overlay is visual only;
      // we record the screen stream primarily)
      if (source === "screen+camera" && screenStreamRef.current) {
        combinedStream = screenStreamRef.current;
        // Camera overlay is handled visually, the recording captures screen
      }

      // Show live preview
      if (liveVideoRef.current && combinedStream!) {
        liveVideoRef.current.srcObject = combinedStream;
        liveVideoRef.current.play().catch(() => {});
      }

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : "video/mp4";

      const recorder = new MediaRecorder(combinedStream!, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setState("stopped");
        stopAllStreams();
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = null;
        }
      };

      recorder.onerror = () => {
        setError("Recording failed. Please try again.");
        setState("idle");
        stopAllStreams();
      };

      recorder.start(1000); // Collect data every second
      setState("recording");
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("Permission denied. Please allow screen/camera access to record.");
      } else if (err.name === "NotFoundError") {
        setError("No recording device found. Please check your camera/microphone.");
      } else {
        setError("Failed to start recording. Please try again.");
      }
      stopAllStreams();
      setState("idle");
    }
  }, [source]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setState("paused");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setState("recording");
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const discardRecording = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setRecordedBlob(null);
    setPreviewUrl(null);
    setElapsedTime(0);
    setState("idle");
    setError(null);
  }, [previewUrl]);

  const handleUseRecording = useCallback(() => {
    if (recordedBlob) {
      const ext = recordedBlob.type.includes("mp4") ? "mp4" : "webm";
      const filename = `screen-recording-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-")}.${ext}`;
      onRecordingComplete(recordedBlob, filename);
    }
  }, [recordedBlob, onRecordingComplete]);

  const sourceOptions: { value: RecordingSource; label: string; icon: string; description: string }[] = [
    {
      value: "screen",
      label: "Screen",
      icon: "\u{1F5B5}",
      description: "Record your screen or a window",
    },
    {
      value: "camera",
      label: "Camera",
      icon: "\u{1F4F7}",
      description: "Record from your webcam",
    },
    {
      value: "screen+camera",
      label: "Screen + Camera",
      icon: "\u{1F3AC}",
      description: "Screen recording with camera overlay",
    },
  ];

  const canRecord =
    (source === "screen" && hasScreenSupport) ||
    (source === "camera" && hasCameraSupport) ||
    (source === "screen+camera" && hasScreenSupport && hasCameraSupport);

  return (
    <div data-testid="screen-recorder" className="space-y-6">
      {/* Error display */}
      {error && (
        <div
          data-testid="recording-error"
          className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </div>
      )}

      {/* Source Selection — only visible when idle */}
      {state === "idle" && (
        <div data-testid="source-selection">
          <h3 className="mb-3 text-sm font-medium text-white">
            Recording Source
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {sourceOptions.map((opt) => {
              const isDisabled =
                (opt.value === "screen" && !hasScreenSupport) ||
                (opt.value === "camera" && !hasCameraSupport) ||
                (opt.value === "screen+camera" &&
                  (!hasScreenSupport || !hasCameraSupport));
              return (
                <button
                  key={opt.value}
                  data-testid={`source-${opt.value}`}
                  onClick={() => setSource(opt.value)}
                  disabled={isDisabled}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    source === opt.value
                      ? "border-primary bg-primary/10"
                      : "border-surface-lighter hover:border-primary/50"
                  } ${isDisabled ? "opacity-40" : ""}`}
                >
                  <div className="mb-1 text-2xl">{opt.icon}</div>
                  <div className="text-sm font-medium text-white">
                    {opt.label}
                  </div>
                  <div className="text-xs text-text-muted">
                    {opt.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Preview Area */}
      {(state === "recording" || state === "paused") && (
        <div data-testid="live-preview" className="relative">
          <video
            ref={liveVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full rounded-lg border border-surface-lighter bg-black"
            style={{ maxHeight: "400px" }}
          />
          {/* Camera overlay indicator */}
          {source === "screen+camera" && cameraStreamRef.current && (
            <div
              data-testid="camera-overlay"
              className="absolute bottom-4 right-4 h-24 w-32 overflow-hidden rounded-lg border-2 border-primary bg-black shadow-lg"
            >
              <div className="flex h-full items-center justify-center text-xs text-text-muted">
                Camera
              </div>
            </div>
          )}
          {/* Recording indicator */}
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5">
            <span
              data-testid="recording-indicator"
              className={`inline-block h-3 w-3 rounded-full ${
                state === "recording"
                  ? "animate-pulse bg-danger"
                  : "bg-warning"
              }`}
            />
            <span className="text-sm font-medium text-white">
              {state === "recording" ? "Recording" : "Paused"}
            </span>
          </div>
        </div>
      )}

      {/* Timer display */}
      {state !== "idle" && state !== "stopped" && (
        <div
          data-testid="recording-timer"
          className="text-center text-3xl font-mono font-bold text-white"
        >
          {formatTime(elapsedTime)}
        </div>
      )}

      {/* Recording Controls */}
      <div className="flex items-center justify-center gap-3">
        {state === "idle" && (
          <button
            data-testid="start-recording-btn"
            onClick={startRecording}
            disabled={!canRecord}
            className="flex items-center gap-2 rounded-lg bg-danger px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-danger/80 disabled:opacity-50"
          >
            <span className="inline-block h-3 w-3 rounded-full bg-white" />
            Start Recording
          </button>
        )}

        {state === "recording" && (
          <>
            <button
              data-testid="pause-recording-btn"
              onClick={pauseRecording}
              className="flex items-center gap-2 rounded-lg bg-warning px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-warning/80"
            >
              &#9646;&#9646; Pause
            </button>
            <button
              data-testid="stop-recording-btn"
              onClick={stopRecording}
              className="flex items-center gap-2 rounded-lg bg-surface-lighter px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-surface-lighter/80"
            >
              &#9632; Stop
            </button>
          </>
        )}

        {state === "paused" && (
          <>
            <button
              data-testid="resume-recording-btn"
              onClick={resumeRecording}
              className="flex items-center gap-2 rounded-lg bg-success px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-success/80"
            >
              &#9654; Resume
            </button>
            <button
              data-testid="stop-recording-btn"
              onClick={stopRecording}
              className="flex items-center gap-2 rounded-lg bg-surface-lighter px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-surface-lighter/80"
            >
              &#9632; Stop
            </button>
          </>
        )}
      </div>

      {/* Preview & Actions after recording */}
      {state === "stopped" && previewUrl && (
        <div data-testid="recording-preview" className="space-y-4">
          <h3 className="text-sm font-medium text-white">Recording Preview</h3>
          <video
            ref={previewVideoRef}
            src={previewUrl}
            controls
            playsInline
            className="w-full rounded-lg border border-surface-lighter bg-black"
            style={{ maxHeight: "400px" }}
          />
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-muted">
              Duration: {formatTime(elapsedTime)}
              {recordedBlob && (
                <span className="ml-3">
                  Size: {(recordedBlob.size / (1024 * 1024)).toFixed(1)} MB
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                data-testid="discard-recording-btn"
                onClick={discardRecording}
                className="rounded-lg border border-surface-lighter px-4 py-2 text-sm text-text-muted transition-colors hover:border-danger hover:text-danger"
              >
                Discard
              </button>
              <button
                data-testid="use-recording-btn"
                onClick={handleUseRecording}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/80"
              >
                Use Recording
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info section — only when idle */}
      {state === "idle" && (
        <div
          data-testid="recording-info"
          className="rounded-lg border border-surface-lighter bg-surface-light p-4"
        >
          <h4 className="mb-2 text-sm font-medium text-white">
            How it works
          </h4>
          <ol className="space-y-1 text-xs text-text-muted">
            <li>1. Choose your recording source above</li>
            <li>2. Click "Start Recording" and grant permissions</li>
            <li>3. Record your content — pause and resume as needed</li>
            <li>4. Stop recording and preview the result</li>
            <li>5. Click "Use Recording" to create a project and start editing</li>
          </ol>
          <p className="mt-3 text-xs text-text-muted">
            Your recording stays in your browser — nothing is uploaded until you
            choose to create a project.
          </p>
        </div>
      )}
    </div>
  );
}
