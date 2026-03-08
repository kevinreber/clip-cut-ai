import { useState, useCallback, useRef } from "react";

interface BatchProject {
  id: string;
  name: string;
  file: File;
  status: "queued" | "uploading" | "analyzing" | "ready" | "error";
  progress: number;
  error?: string;
}

interface BatchProcessingProps {
  onProjectCreated: (projectId: string) => void;
  createProject: (name: string) => Promise<string>;
  generateUploadUrl: () => Promise<string>;
  attachVideo: (args: { projectId: string; storageId: string }) => Promise<void>;
  analyzeVideo: (args: { projectId: string }) => Promise<void>;
}

export function BatchProcessing({
  onProjectCreated,
  createProject,
  generateUploadUrl,
  attachVideo,
  analyzeVideo,
}: BatchProcessingProps) {
  const [expanded, setExpanded] = useState(false);
  const [projects, setProjects] = useState<BatchProject[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  const handleFilesSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newProjects: BatchProject[] = files
      .filter((f) => f.type.startsWith("video/") || f.type.startsWith("audio/"))
      .map((file) => ({
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^/.]+$/, ""),
        file,
        status: "queued" as const,
        progress: 0,
      }));

    if (newProjects.length === 0) return;

    setProjects((prev) => [...prev, ...newProjects]);
    setExpanded(true);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<BatchProject>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const processQueue = useCallback(async () => {
    setIsProcessing(true);
    abortRef.current = false;

    const queued = projects.filter((p) => p.status === "queued");

    for (const project of queued) {
      if (abortRef.current) break;

      try {
        // 1. Create project
        updateProject(project.id, { status: "uploading", progress: 10 });
        const projectId = await createProject(project.name);

        // 2. Upload video
        updateProject(project.id, { progress: 20 });
        const uploadUrl = await generateUploadUrl();

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": project.file.type },
          body: project.file,
        });

        if (!uploadResponse.ok) {
          throw new Error("Upload failed");
        }

        const { storageId } = await uploadResponse.json();
        updateProject(project.id, { progress: 50 });

        // 3. Attach video
        await attachVideo({ projectId, storageId });
        updateProject(project.id, { progress: 60, status: "analyzing" });

        // 4. Analyze
        await analyzeVideo({ projectId });
        updateProject(project.id, { status: "ready", progress: 100 });
        onProjectCreated(projectId);
      } catch (err: any) {
        updateProject(project.id, {
          status: "error",
          error: err.message || "Processing failed",
        });
      }
    }

    setIsProcessing(false);
  }, [projects, createProject, generateUploadUrl, attachVideo, analyzeVideo, updateProject, onProjectCreated]);

  const handleRemoveCompleted = useCallback(() => {
    setProjects((prev) => prev.filter((p) => p.status !== "ready" && p.status !== "error"));
  }, []);

  const handleAbort = useCallback(() => {
    abortRef.current = true;
  }, []);

  const handleRemove = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const queuedCount = projects.filter((p) => p.status === "queued").length;
  const processingCount = projects.filter((p) => p.status === "uploading" || p.status === "analyzing").length;
  const completedCount = projects.filter((p) => p.status === "ready").length;
  const errorCount = projects.filter((p) => p.status === "error").length;

  const STATUS_LABELS: Record<BatchProject["status"], { text: string; color: string }> = {
    queued: { text: "Queued", color: "text-text-muted" },
    uploading: { text: "Uploading", color: "text-blue-400" },
    analyzing: { text: "Analyzing", color: "text-yellow-400" },
    ready: { text: "Done", color: "text-success" },
    error: { text: "Error", color: "text-red-400" },
  };

  return (
    <div
      className="rounded-lg border border-surface-lighter bg-surface-light"
      data-testid="batch-processing"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-white">
          Batch Processing
          {projects.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-text-muted">
              ({completedCount}/{projects.length} done)
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {projects.length > 0 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="rounded-md bg-surface-lighter px-2 py-0.5 text-xs text-text-muted transition-colors hover:text-white"
            >
              {expanded ? "Collapse" : "Expand"}
            </button>
          )}
          <label className="rounded-md bg-primary/20 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/30 cursor-pointer">
            Add Videos
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*,audio/*"
              onChange={handleFilesSelected}
              className="hidden"
              data-testid="batch-file-input"
            />
          </label>
        </div>
      </div>

      {expanded && projects.length > 0 && (
        <div className="border-t border-surface-lighter">
          {/* Summary bar */}
          <div className="flex items-center gap-3 px-4 py-2 text-[10px] text-text-muted bg-surface/50">
            {queuedCount > 0 && <span>{queuedCount} queued</span>}
            {processingCount > 0 && <span className="text-blue-400">{processingCount} processing</span>}
            {completedCount > 0 && <span className="text-success">{completedCount} done</span>}
            {errorCount > 0 && <span className="text-red-400">{errorCount} failed</span>}
          </div>

          {/* Project list */}
          {projects.map((project) => {
            const statusInfo = STATUS_LABELS[project.status];
            return (
              <div
                key={project.id}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-surface-lighter last:border-b-0"
                data-testid={`batch-item-${project.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text truncate">
                      {project.name}
                    </span>
                    <span className={`text-[10px] font-medium ${statusInfo.color}`}>
                      {statusInfo.text}
                    </span>
                  </div>
                  {project.error && (
                    <p className="text-[10px] text-red-400 mt-0.5 truncate">
                      {project.error}
                    </p>
                  )}
                  {(project.status === "uploading" || project.status === "analyzing") && (
                    <div className="h-1 w-full overflow-hidden rounded-full bg-surface-lighter mt-1">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                {(project.status === "queued" || project.status === "ready" || project.status === "error") && (
                  <button
                    onClick={() => handleRemove(project.id)}
                    className="text-xs text-text-muted hover:text-red-400 transition-colors shrink-0"
                    title="Remove"
                  >
                    &#10005;
                  </button>
                )}
              </div>
            );
          })}

          {/* Action buttons */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-surface/50">
            {queuedCount > 0 && !isProcessing && (
              <button
                onClick={processQueue}
                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-primary/80"
                data-testid="start-batch-btn"
              >
                Process {queuedCount} Video{queuedCount !== 1 ? "s" : ""}
              </button>
            )}
            {isProcessing && (
              <button
                onClick={handleAbort}
                className="rounded-md bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30"
              >
                Stop After Current
              </button>
            )}
            {(completedCount > 0 || errorCount > 0) && !isProcessing && (
              <button
                onClick={handleRemoveCompleted}
                className="rounded-md bg-surface-lighter px-3 py-1 text-xs text-text-muted transition-colors hover:text-white"
              >
                Clear Finished
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
