import { useState, useCallback, useMemo } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useToast } from "./Toast";

type AssemblyMode = "best-story" | "highlight-reel" | "chronological" | "custom";
type TransitionType = "cut" | "crossfade" | "fade-to-black";

interface _SequenceSegment {
  projectId: string;
  projectName: string;
  start: number;
  end: number;
  order: number;
  included: boolean;
}

const ASSEMBLY_MODES: Array<{ value: AssemblyMode; label: string; description: string }> = [
  {
    value: "best-story",
    label: "Best Story",
    description: "AI reorders clips for the most compelling narrative arc",
  },
  {
    value: "highlight-reel",
    label: "Highlight Reel",
    description: "AI picks the top moments from each clip",
  },
  {
    value: "chronological",
    label: "Chronological",
    description: "Clips in order with smart trimming",
  },
  {
    value: "custom",
    label: "Custom",
    description: "AI suggests, then you drag to reorder",
  },
];

const TRANSITIONS: Array<{ value: TransitionType; label: string }> = [
  { value: "cut", label: "Hard Cut" },
  { value: "crossfade", label: "Crossfade" },
  { value: "fade-to-black", label: "Fade to Black" },
];

// Color palette for source project indicators
const PROJECT_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function StoryAssembly() {
  const projects = useQuery(api.projects.list);
  const compilations = useQuery(api.compilations.list);
  const createCompilation = useMutation(api.compilations.create);
  const deleteCompilation = useMutation(api.compilations.deleteCompilation);
  const updateFinalSequence = useMutation(api.compilations.updateFinalSequence);
  const updateTransition = useMutation(api.compilations.updateTransition);
  const analyzeForAssembly = useAction(api.compileAi.analyzeForAssembly);
  const { addToast } = useToast();

  const [step, setStep] = useState<"list" | "select" | "review">("list");
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [assemblyMode, setAssemblyMode] = useState<AssemblyMode>("best-story");
  const [compilationName, setCompilationName] = useState("");
  const [activeCompilationId, setActiveCompilationId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const readyProjects = useMemo(
    () =>
      (projects || []).filter(
        (p) => p.status === "ready" && p.transcript && p.transcript.length > 0
      ),
    [projects]
  );

  const activeCompilation = useMemo(
    () =>
      compilations?.find((c) => c._id === activeCompilationId) ?? null,
    [compilations, activeCompilationId]
  );

  const toggleProject = useCallback((id: string) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCreate = useCallback(async () => {
    if (selectedProjectIds.size < 2) {
      addToast("Select at least 2 projects to combine.", "warning");
      return;
    }
    const name =
      compilationName.trim() ||
      `Compilation ${new Date().toLocaleDateString()}`;
    try {
      const id = await createCompilation({
        name,
        sourceProjectIds: Array.from(selectedProjectIds) as any,
        assemblyMode,
      });
      setActiveCompilationId(id);
      setStep("review");
      addToast("Compilation created! Analyzing...", "success");

      // Start AI analysis
      setIsAnalyzing(true);
      try {
        await analyzeForAssembly({ compilationId: id });
        addToast("AI assembly suggestion ready!", "success");
      } catch (err: any) {
        addToast(
          err?.message || "AI analysis failed. Try again.",
          "error"
        );
      } finally {
        setIsAnalyzing(false);
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to create compilation.", "error");
    }
  }, [
    selectedProjectIds,
    compilationName,
    assemblyMode,
    createCompilation,
    analyzeForAssembly,
    addToast,
  ]);

  const handleReanalyze = useCallback(async () => {
    if (!activeCompilationId) return;
    setIsAnalyzing(true);
    try {
      await analyzeForAssembly({
        compilationId: activeCompilationId as any,
      });
      addToast("Re-analysis complete!", "success");
    } catch (err: any) {
      addToast(err?.message || "Analysis failed.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  }, [activeCompilationId, analyzeForAssembly, addToast]);

  const handleDeleteCompilation = useCallback(
    async (id: string) => {
      try {
        await deleteCompilation({ id: id as any });
        addToast("Compilation deleted.", "info");
        if (activeCompilationId === id) {
          setActiveCompilationId(null);
          setStep("list");
        }
      } catch {
        addToast("Failed to delete.", "error");
      }
    },
    [deleteCompilation, addToast, activeCompilationId]
  );

  const handleToggleSegment = useCallback(
    async (index: number) => {
      if (!activeCompilation?.finalSequence) return;
      const updated = activeCompilation.finalSequence.map((seg, i) =>
        i === index ? { ...seg, included: !seg.included } : seg
      );
      await updateFinalSequence({
        id: activeCompilation._id,
        finalSequence: updated as any,
      });
    },
    [activeCompilation, updateFinalSequence]
  );

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === targetIndex) return;
      if (!activeCompilation?.finalSequence) return;

      const items = [...activeCompilation.finalSequence];
      const [dragged] = items.splice(dragIndex, 1);
      items.splice(targetIndex, 0, dragged);

      // Re-number order
      const reordered = items.map((seg, i) => ({
        ...seg,
        order: i + 1,
      }));

      setDragIndex(targetIndex);
      updateFinalSequence({
        id: activeCompilation._id,
        finalSequence: reordered as any,
      });
    },
    [dragIndex, activeCompilation, updateFinalSequence]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
  }, []);

  const handleTransitionChange = useCallback(
    async (transition: TransitionType) => {
      if (!activeCompilation) return;
      await updateTransition({
        id: activeCompilation._id,
        transition,
      });
    },
    [activeCompilation, updateTransition]
  );

  // Build project color map
  const projectColorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (activeCompilation) {
      activeCompilation.sourceProjectIds.forEach((id, i) => {
        map.set(id, PROJECT_COLORS[i % PROJECT_COLORS.length]);
      });
    }
    return map;
  }, [activeCompilation]);

  const totalDuration = useMemo(() => {
    if (!activeCompilation?.finalSequence) return 0;
    return activeCompilation.finalSequence
      .filter((s) => s.included)
      .reduce((sum, s) => sum + (s.end - s.start), 0);
  }, [activeCompilation]);

  // ---- RENDER ----

  // List view
  if (step === "list") {
    return (
      <div data-testid="story-assembly">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              AI Story Assembly
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Combine multiple videos into a single cohesive narrative
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedProjectIds(new Set());
              setCompilationName("");
              setStep("select");
            }}
            disabled={readyProjects.length < 2}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="new-compilation-btn"
          >
            + New Compilation
          </button>
        </div>

        {readyProjects.length < 2 && (
          <div className="rounded-lg border border-surface-lighter bg-surface-light p-6 text-center">
            <p className="text-text-muted">
              Upload and analyze at least 2 videos to start combining them.
            </p>
          </div>
        )}

        {compilations && compilations.length > 0 && (
          <div className="space-y-3" data-testid="compilations-list">
            {compilations.map((comp) => (
              <div
                key={comp._id}
                className="group flex items-center justify-between rounded-lg border border-surface-lighter bg-surface-light p-4 transition-colors hover:border-primary"
              >
                <button
                  className="flex-1 text-left"
                  onClick={() => {
                    setActiveCompilationId(comp._id);
                    setStep("review");
                  }}
                  data-testid={`compilation-${comp._id}`}
                >
                  <h4 className="font-medium text-white">{comp.name}</h4>
                  <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
                    <span className="capitalize">
                      {comp.assemblyMode.replace("-", " ")}
                    </span>
                    <span>
                      {comp.sourceProjectIds.length} source video
                      {comp.sourceProjectIds.length !== 1 ? "s" : ""}
                    </span>
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        comp.status === "done"
                          ? "bg-success"
                          : comp.status === "analyzing"
                            ? "bg-warning"
                            : comp.status === "reviewed"
                              ? "bg-primary"
                              : "bg-text-muted"
                      }`}
                    />
                    <span className="capitalize">{comp.status}</span>
                  </div>
                </button>
                <button
                  onClick={() => handleDeleteCompilation(comp._id)}
                  className="rounded p-1 text-text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                  data-testid="delete-compilation-btn"
                >
                  &#10005;
                </button>
              </div>
            ))}
          </div>
        )}

        {compilations && compilations.length === 0 && readyProjects.length >= 2 && (
          <div className="rounded-lg border border-dashed border-surface-lighter p-8 text-center">
            <p className="mb-2 text-lg text-text-muted">No compilations yet</p>
            <p className="text-sm text-text-muted">
              Click "New Compilation" to combine your videos with AI
            </p>
          </div>
        )}
      </div>
    );
  }

  // Select projects view
  if (step === "select") {
    return (
      <div data-testid="story-assembly-select">
        <div className="mb-6">
          <button
            onClick={() => setStep("list")}
            className="mb-4 text-sm text-text-muted hover:text-white"
          >
            &larr; Back
          </button>
          <h2 className="text-xl font-bold text-white">
            Select Videos to Combine
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Choose 2 or more analyzed videos, then pick an assembly mode
          </p>
        </div>

        {/* Name input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Compilation name (optional)"
            value={compilationName}
            onChange={(e) => setCompilationName(e.target.value)}
            className="w-full rounded-lg border border-surface-lighter bg-surface px-3 py-2 text-sm text-white placeholder-text-muted outline-none focus:border-primary"
            data-testid="compilation-name-input"
          />
        </div>

        {/* Project selection grid */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="project-selector">
          {readyProjects.map((project) => {
            const isSelected = selectedProjectIds.has(project._id);
            return (
              <button
                key={project._id}
                onClick={() => toggleProject(project._id)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-surface-lighter bg-surface-light hover:border-primary/50"
                }`}
                data-testid={`select-project-${project._id}`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                    isSelected
                      ? "border-primary bg-primary text-white"
                      : "border-surface-lighter"
                  }`}
                >
                  {isSelected && <span className="text-xs">&#10003;</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {project.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {project.transcript?.length ?? 0} words
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Assembly mode picker */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Assembly Mode
          </h3>
          <div
            className="grid gap-2 sm:grid-cols-2"
            data-testid="assembly-mode-picker"
          >
            {ASSEMBLY_MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setAssemblyMode(mode.value)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  assemblyMode === mode.value
                    ? "border-primary bg-primary/10"
                    : "border-surface-lighter bg-surface-light hover:border-primary/50"
                }`}
                data-testid={`mode-${mode.value}`}
              >
                <p className="text-sm font-medium text-white">{mode.label}</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {mode.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Create button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreate}
            disabled={selectedProjectIds.size < 2}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="create-compilation-btn"
          >
            Combine {selectedProjectIds.size} Video
            {selectedProjectIds.size !== 1 ? "s" : ""}
          </button>
          <span className="text-xs text-text-muted">
            {selectedProjectIds.size < 2
              ? `Select ${2 - selectedProjectIds.size} more`
              : "Ready to combine!"}
          </span>
        </div>
      </div>
    );
  }

  // Review / assembly view
  return (
    <div data-testid="story-assembly-review">
      <div className="mb-6">
        <button
          onClick={() => {
            setActiveCompilationId(null);
            setStep("list");
          }}
          className="mb-4 text-sm text-text-muted hover:text-white"
          data-testid="back-to-list-btn"
        >
          &larr; Back to compilations
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              {activeCompilation?.name || "Compilation"}
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {activeCompilation?.assemblyMode
                ? ASSEMBLY_MODES.find(
                    (m) => m.value === activeCompilation.assemblyMode
                  )?.label
                : ""}{" "}
              &middot;{" "}
              {activeCompilation?.sourceProjectIds.length ?? 0} source videos
            </p>
          </div>
          <button
            onClick={handleReanalyze}
            disabled={isAnalyzing}
            className="rounded-md bg-primary/20 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/30 disabled:opacity-50"
            data-testid="reanalyze-btn"
          >
            {isAnalyzing ? "Analyzing..." : "Re-analyze"}
          </button>
        </div>
      </div>

      {/* Analyzing state */}
      {isAnalyzing && (
        <div className="mb-6 rounded-lg border border-warning/30 bg-warning/10 p-4 text-center" data-testid="analyzing-indicator">
          <div className="mb-2 text-lg animate-spin inline-block">&#9881;</div>
          <p className="text-sm text-warning">
            AI is analyzing transcripts and assembling your story...
          </p>
        </div>
      )}

      {/* AI Narrative Summary */}
      {activeCompilation?.aiSuggestion && !isAnalyzing && (
        <div
          className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4"
          data-testid="narrative-summary"
        >
          <h3 className="mb-1 text-sm font-semibold text-primary">
            AI Narrative Summary
          </h3>
          <p className="text-sm text-text leading-relaxed">
            {activeCompilation.aiSuggestion.narrativeSummary}
          </p>
        </div>
      )}

      {/* Transition selector */}
      {activeCompilation?.finalSequence && !isAnalyzing && (
        <div className="mb-4 flex items-center gap-3" data-testid="transition-selector">
          <span className="text-xs text-text-muted">Transition:</span>
          {TRANSITIONS.map((t) => (
            <button
              key={t.value}
              onClick={() => handleTransitionChange(t.value)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                (activeCompilation.transition ?? "cut") === t.value
                  ? "bg-primary text-white"
                  : "bg-surface-lighter text-text-muted hover:text-white"
              }`}
              data-testid={`transition-${t.value}`}
            >
              {t.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-text-muted">
            Total: {formatDuration(totalDuration)}
          </span>
        </div>
      )}

      {/* Segment timeline */}
      {activeCompilation?.finalSequence && !isAnalyzing && (
        <div className="space-y-2" data-testid="assembly-timeline">
          {activeCompilation.finalSequence.map((seg, i) => {
            const color = projectColorMap.get(seg.projectId) || "#666";
            const duration = seg.end - seg.start;
            const aiReason = activeCompilation.aiSuggestion?.segments.find(
              (s) =>
                s.projectId === seg.projectId &&
                s.start === seg.start &&
                s.end === seg.end
            )?.reason;

            return (
              <div
                key={`${seg.projectId}-${seg.start}-${i}`}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                  dragIndex === i
                    ? "border-primary bg-primary/10 opacity-50"
                    : seg.included
                      ? "border-surface-lighter bg-surface-light"
                      : "border-surface-lighter/50 bg-surface-light/30 opacity-50"
                }`}
                data-testid={`segment-${i}`}
              >
                {/* Drag handle */}
                <span className="cursor-grab text-text-muted hover:text-white">
                  &#9776;
                </span>

                {/* Project color indicator */}
                <div
                  className="h-8 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />

                {/* Segment info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white">
                      {seg.projectName}
                    </span>
                    <span className="font-mono text-xs text-text-muted tabular-nums">
                      {formatTimestamp(seg.start)} -{" "}
                      {formatTimestamp(seg.end)}
                    </span>
                    <span className="text-xs text-text-muted">
                      ({formatDuration(duration)})
                    </span>
                  </div>
                  {aiReason && (
                    <p className="mt-0.5 text-xs text-text-muted/80 leading-snug">
                      {aiReason}
                    </p>
                  )}
                </div>

                {/* Include/exclude toggle */}
                <button
                  onClick={() => handleToggleSegment(i)}
                  className={`shrink-0 rounded-md px-2 py-1 text-xs transition-colors ${
                    seg.included
                      ? "bg-success/20 text-success"
                      : "bg-surface-lighter text-text-muted"
                  }`}
                  data-testid={`toggle-segment-${i}`}
                >
                  {seg.included ? "Included" : "Excluded"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Visual timeline bar */}
      {activeCompilation?.finalSequence && !isAnalyzing && (
        <div className="mt-4 rounded-lg border border-surface-lighter bg-surface-light p-3" data-testid="visual-timeline">
          <p className="mb-2 text-xs text-text-muted">Combined Timeline</p>
          <div className="flex h-6 overflow-hidden rounded-md">
            {activeCompilation.finalSequence
              .filter((s) => s.included)
              .map((seg, i) => {
                const duration = seg.end - seg.start;
                const widthPercent = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;
                const color = projectColorMap.get(seg.projectId) || "#666";
                return (
                  <div
                    key={`bar-${i}`}
                    className="h-full border-r border-surface/50 transition-all"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: color,
                      minWidth: "4px",
                    }}
                    title={`${seg.projectName}: ${formatTimestamp(seg.start)} - ${formatTimestamp(seg.end)}`}
                  />
                );
              })}
          </div>
          {/* Legend */}
          <div className="mt-2 flex flex-wrap gap-3">
            {activeCompilation.sourceProjectIds.map((id, i) => {
              const color = PROJECT_COLORS[i % PROJECT_COLORS.length];
              const name =
                activeCompilation.finalSequence?.find(
                  (s) => s.projectId === id
                )?.projectName || `Video ${i + 1}`;
              return (
                <div key={id} className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-text-muted">{name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state when no suggestion yet */}
      {!activeCompilation?.finalSequence && !isAnalyzing && (
        <div className="rounded-lg border border-dashed border-surface-lighter p-8 text-center">
          <p className="text-text-muted">
            Click "Re-analyze" to generate an AI assembly suggestion.
          </p>
        </div>
      )}
    </div>
  );
}
