import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useMemo, useRef, useState } from "react";
import "../styles.css";
import { AuthForm } from "../components/AuthForm";
import { UserMenu } from "../components/UserMenu";
import { useToast } from "../components/Toast";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  return <AuthenticatedHome />;
}

type SortOption = "newest" | "oldest" | "name";

function AuthenticatedHome() {
  const projects = useQuery(api.projects.list);
  const createProject = useMutation(api.projects.create);
  const generateUploadUrl = useMutation(api.projects.generateUploadUrl);
  const attachVideo = useMutation(api.projects.attachVideo);
  const deleteProject = useMutation(api.projects.deleteProject);
  const navigate = useNavigate();

  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [isDragging, setIsDragging] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 12;

  const allFilteredProjects = useMemo(() => {
    if (!projects) return [];
    let result = projects;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.createdAt - a.createdAt;
        case "oldest":
          return a.createdAt - b.createdAt;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [projects, searchQuery, sortBy]);

  const totalPages = Math.ceil(allFilteredProjects.length / pageSize);
  const filteredProjects = useMemo(
    () => allFilteredProjects.slice(page * pageSize, (page + 1) * pageSize),
    [allFilteredProjects, page]
  );

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("video/")) {
      processUpload(file);
    } else {
      addToast("Please drop a video file (MP4, MOV, WebM).", "warning");
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    processUpload(file);
  }

  async function processUpload(file: File) {
    if (!file.type.startsWith("video/")) {
      addToast("Please select a video file.", "warning");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const projectName = file.name.replace(/\.[^/.]+$/, "");
      const projectId = await createProject({ name: projectName });

      const uploadUrl = await generateUploadUrl();

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      });

      const storageId = await new Promise<string>((resolve, reject) => {
        xhr.open("POST", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.onload = () => {
          if (xhr.status === 200) {
            const { storageId } = JSON.parse(xhr.responseText);
            resolve(storageId);
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(file);
      });

      await attachVideo({
        projectId,
        storageId: storageId as any,
      });

      navigate({ to: "/project/$id", params: { id: projectId } });
    } catch (err) {
      console.error("Upload failed:", err);
      addToast("Upload failed. Please try again.", "error");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-surface-lighter px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-xl font-bold text-white sm:text-2xl">
            ClipCut <span className="text-primary">AI</span>
          </h1>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 text-center sm:mb-12">
          <h2 className="mb-3 text-2xl font-bold text-white sm:text-4xl">
            Remove filler words instantly
          </h2>
          <p className="text-base text-text-muted sm:text-lg">
            Upload a video and let AI detect ums, uhs, silences, and
            repetitions. Edit your transcript to cut your video.
          </p>
        </div>

        <div className="mb-8 flex justify-center sm:mb-12">
          <label
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex w-full max-w-md cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-8 py-10 transition-colors sm:px-16 sm:py-12 ${
              isDragging
                ? "border-primary bg-primary/20 scale-105"
                : uploading
                  ? "border-primary bg-primary/10"
                  : "border-surface-lighter hover:border-primary hover:bg-surface-light"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            {uploading ? (
              <>
                <div className="mb-4 text-4xl">&#8635;</div>
                <p className="mb-2 text-lg font-medium text-white">
                  Uploading... {uploadProgress}%
                </p>
                <div className="h-2 w-48 overflow-hidden rounded-full bg-surface-lighter">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 text-4xl">&#128249;</div>
                <p className="mb-1 text-lg font-medium text-white">
                  {isDragging ? "Drop your video here" : "Upload a video to get started"}
                </p>
                <p className="text-sm text-text-muted">
                  Drag & drop or click to browse. MP4, MOV, WebM supported.
                </p>
              </>
            )}
          </label>
        </div>

        {projects && projects.length > 0 && (
          <div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-xl font-semibold text-white">
                Your Projects
                <span className="ml-2 text-sm font-normal text-text-muted">
                  ({allFilteredProjects.length}
                  {searchQuery ? ` of ${projects.length}` : ""})
                </span>
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-lg border border-surface-lighter bg-surface px-3 py-1.5 text-sm text-white placeholder-text-muted outline-none focus:border-primary"
                />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="rounded-lg border border-surface-lighter bg-surface px-3 py-1.5 text-sm text-white outline-none focus:border-primary"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="name">Name</option>
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <div
                  key={project._id}
                  className="group cursor-pointer rounded-lg border border-surface-lighter bg-surface-light p-4 transition-colors hover:border-primary"
                  onClick={() =>
                    navigate({
                      to: "/project/$id",
                      params: { id: project._id },
                    })
                  }
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="truncate font-medium text-white">
                      {project.name}
                    </h4>
                    {confirmDeleteId === project._id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="rounded px-1.5 py-0.5 text-xs bg-danger/20 text-danger hover:bg-danger/30"
                          onClick={() => {
                            deleteProject({ id: project._id });
                            setConfirmDeleteId(null);
                            addToast("Project deleted.", "info");
                          }}
                        >
                          Delete
                        </button>
                        <button
                          className="rounded px-1.5 py-0.5 text-xs bg-surface-lighter text-text-muted hover:text-white"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="rounded p-1 text-text-muted opacity-0 transition-opacity hover:bg-surface-lighter hover:text-danger group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(project._id);
                        }}
                      >
                        &#10005;
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        project.status === "ready"
                          ? "bg-success"
                          : project.status === "analyzing"
                            ? "bg-warning"
                            : "bg-text-muted"
                      }`}
                    />
                    <span className="capitalize">{project.status}</span>
                    <span className="ml-auto">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-md bg-surface-lighter px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  &larr; Prev
                </button>
                <span className="text-sm text-text-muted">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-md bg-surface-lighter px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
