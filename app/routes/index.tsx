import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCallback, useMemo, useRef, useState } from "react";
import "../styles.css";
import { UserMenu } from "../components/UserMenu";
import { useToast } from "../components/Toast";
import { LandingPage } from "../components/LandingPage";
import { BatchProcessing } from "../components/BatchProcessing";

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
    return <LandingPage />;
  }

  return <AuthenticatedHome />;
}

const FOLDER_COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ef4444", // red
  "#8b5cf6", // violet
  "#14b8a6", // teal
];

type SortOption = "newest" | "oldest" | "name";

function AuthenticatedHome() {
  const projects = useQuery(api.projects.list);
  const folders = useQuery(api.folders.list);
  const createProject = useMutation(api.projects.create);
  const generateUploadUrl = useMutation(api.projects.generateUploadUrl);
  const attachVideo = useMutation(api.projects.attachVideo);
  const deleteProject = useMutation(api.projects.deleteProject);
  const deleteMultipleProjects = useMutation(api.projects.deleteMultipleProjects);
  const duplicateProject = useMutation(api.projects.duplicateProject);
  const moveMultipleToFolder = useMutation(api.projects.moveMultipleToFolder);
  const addTag = useMutation(api.projects.addTag);
  const removeTag = useMutation(api.projects.removeTag);
  const addTagToMultiple = useMutation(api.projects.addTagToMultiple);
  const createFolder = useMutation(api.folders.create);
  const renameFolder = useMutation(api.folders.rename);
  const updateFolderColor = useMutation(api.folders.updateColor);
  const deleteFolderMut = useMutation(api.folders.deleteFolder);
  const analyzeVideo = useAction(api.analyze.analyzeVideo);
  const navigate = useNavigate();

  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [isDragging, setIsDragging] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const pageSize = 12;

  // Folder state
  const [activeFolder, setActiveFolder] = useState<string | null>(null); // null = all, "unfiled" = no folder, or folder ID
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [folderMenuId, setFolderMenuId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Tag filter state
  const [activeTagFilters, setActiveTagFilters] = useState<Set<string>>(new Set());
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [tagInput, setTagInput] = useState<string | null>(null); // project ID being tagged
  const [tagInputValue, setTagInputValue] = useState("");

  // Batch action state
  const [showBatchFolder, setShowBatchFolder] = useState(false);
  const [showBatchTag, setShowBatchTag] = useState(false);
  const [batchTagValue, setBatchTagValue] = useState("");

  // Collect all tags across projects for autocomplete
  const allTags = useMemo(() => {
    if (!projects) return [];
    const tagSet = new Set<string>();
    for (const p of projects) {
      if (p.tags) {
        for (const t of p.tags) tagSet.add(t);
      }
    }
    return Array.from(tagSet).sort();
  }, [projects]);

  const toggleProjectSelection = useCallback((projectId: string) => {
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  const handleBatchDelete = useCallback(async () => {
    if (selectedProjects.size === 0) return;
    try {
      await deleteMultipleProjects({ ids: Array.from(selectedProjects) as any });
      addToast(`${selectedProjects.size} project(s) deleted.`, "info");
      setSelectedProjects(new Set());
    } catch {
      addToast("Failed to delete projects.", "error");
    }
  }, [selectedProjects, deleteMultipleProjects, addToast]);

  const handleDuplicateProject = useCallback(
    async (projectId: string) => {
      try {
        await duplicateProject({ id: projectId as any });
        addToast("Project duplicated!", "success");
      } catch {
        addToast("Failed to duplicate project.", "error");
      }
    },
    [duplicateProject, addToast]
  );

  const handleBatchMoveToFolder = useCallback(
    async (folderId: string | undefined) => {
      if (selectedProjects.size === 0) return;
      try {
        await moveMultipleToFolder({
          ids: Array.from(selectedProjects) as any,
          folderId: folderId as any,
        });
        addToast(`${selectedProjects.size} project(s) moved.`, "success");
        setShowBatchFolder(false);
      } catch {
        addToast("Failed to move projects.", "error");
      }
    },
    [selectedProjects, moveMultipleToFolder, addToast]
  );

  const handleBatchAddTag = useCallback(async () => {
    if (selectedProjects.size === 0 || !batchTagValue.trim()) return;
    try {
      await addTagToMultiple({
        ids: Array.from(selectedProjects) as any,
        tag: batchTagValue.trim(),
      });
      addToast(`Tag "${batchTagValue.trim()}" added to ${selectedProjects.size} project(s).`, "success");
      setBatchTagValue("");
      setShowBatchTag(false);
    } catch {
      addToast("Failed to add tag.", "error");
    }
  }, [selectedProjects, batchTagValue, addTagToMultiple, addToast]);

  const allFilteredProjects = useMemo(() => {
    if (!projects) return [];
    let result = projects;

    // Folder filter
    if (activeFolder === "unfiled") {
      result = result.filter((p) => !p.folderId);
    } else if (activeFolder) {
      result = result.filter((p) => p.folderId === activeFolder);
    }

    // Tag filter
    if (activeTagFilters.size > 0) {
      result = result.filter((p) =>
        p.tags && p.tags.some((t) => activeTagFilters.has(t))
      );
    }

    // Search filter
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
  }, [projects, searchQuery, sortBy, activeFolder, activeTagFilters]);

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

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    try {
      await createFolder({ name: newFolderName.trim(), color: FOLDER_COLORS[0] });
      setNewFolderName("");
      setShowNewFolder(false);
      addToast("Folder created!", "success");
    } catch {
      addToast("Failed to create folder.", "error");
    }
  }

  async function handleRenameFolder(folderId: string) {
    if (!editingFolderName.trim()) return;
    try {
      await renameFolder({ id: folderId as any, name: editingFolderName.trim() });
      setEditingFolderId(null);
      setEditingFolderName("");
    } catch {
      addToast("Failed to rename folder.", "error");
    }
  }

  async function handleDeleteFolder(folderId: string) {
    try {
      await deleteFolderMut({ id: folderId as any });
      if (activeFolder === folderId) setActiveFolder(null);
      setFolderMenuId(null);
      addToast("Folder deleted.", "info");
    } catch {
      addToast("Failed to delete folder.", "error");
    }
  }

  async function handleAddTag(projectId: string, tag: string) {
    if (!tag.trim()) return;
    try {
      await addTag({ projectId: projectId as any, tag: tag.trim() });
      setTagInput(null);
      setTagInputValue("");
    } catch {
      addToast("Failed to add tag.", "error");
    }
  }

  async function handleRemoveTag(projectId: string, tag: string) {
    try {
      await removeTag({ projectId: projectId as any, tag });
    } catch {
      addToast("Failed to remove tag.", "error");
    }
  }

  const tagSuggestions = useMemo(() => {
    if (!tagInputValue.trim()) return allTags.slice(0, 8);
    const q = tagInputValue.toLowerCase();
    return allTags.filter((t) => t.toLowerCase().includes(q)).slice(0, 8);
  }, [allTags, tagInputValue]);

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-surface-lighter px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-xl font-bold text-white sm:text-2xl">
            ClipCut <span className="text-primary">AI</span>
          </h1>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 text-center sm:mb-12">
          <h2 className="mb-3 text-2xl font-bold text-white sm:text-4xl">
            Remove filler words instantly
          </h2>
          <p className="text-base text-text-muted sm:text-lg">
            Upload a video and let AI detect ums, uhs, silences, and
            repetitions. Edit your transcript to cut your video.
          </p>
        </div>

        {/* Batch Processing */}
        <div className="mb-8 mx-auto max-w-2xl">
          <BatchProcessing
            onProjectCreated={() => {
              addToast("Batch project ready!", "success");
            }}
            createProject={async (name: string) => {
              const id = await createProject({ name });
              return id as string;
            }}
            generateUploadUrl={async () => {
              return await generateUploadUrl();
            }}
            attachVideo={async ({ projectId, storageId }) => {
              await attachVideo({ projectId: projectId as any, storageId: storageId as any });
            }}
            analyzeVideo={async ({ projectId }) => {
              await analyzeVideo({ projectId: projectId as any });
            }}
          />
        </div>

        <div className="mb-8 flex flex-col items-center gap-4 sm:mb-12">
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

          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span>or</span>
            <button
              data-testid="record-screen-btn"
              onClick={() => navigate({ to: "/record" })}
              className="flex items-center gap-2 rounded-lg border border-danger/50 bg-danger/10 px-4 py-2 font-medium text-danger transition-colors hover:bg-danger/20"
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-danger" />
              Record Screen
            </button>
            <span>or</span>
            <button
              data-testid="combine-videos-btn"
              onClick={() => navigate({ to: "/compilations" })}
              className="flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 font-medium text-primary transition-colors hover:bg-primary/20"
            >
              Combine Videos
            </button>
          </div>
        </div>

        {projects && projects.length > 0 && (
          <div className="flex gap-6">
            {/* Folder Sidebar */}
            <div className={`shrink-0 ${sidebarOpen ? "w-52" : "w-8"} transition-all`}>
              <div className="sticky top-4">
                <div className="mb-2 flex items-center justify-between">
                  {sidebarOpen && (
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Folders
                    </span>
                  )}
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="rounded p-1 text-text-muted hover:bg-surface-lighter hover:text-white"
                    data-testid="toggle-folder-sidebar"
                    title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                  >
                    {sidebarOpen ? "\u25C0" : "\u25B6"}
                  </button>
                </div>

                {sidebarOpen && (
                  <div className="space-y-0.5" data-testid="folder-sidebar">
                    {/* All Projects */}
                    <button
                      onClick={() => { setActiveFolder(null); setPage(0); }}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        activeFolder === null
                          ? "bg-primary/15 text-primary"
                          : "text-text-muted hover:bg-surface-lighter hover:text-white"
                      }`}
                      data-testid="folder-all"
                    >
                      <span className="text-xs">&#128193;</span>
                      All Projects
                      <span className="ml-auto text-xs opacity-60">{projects.length}</span>
                    </button>

                    {/* Unfiled */}
                    <button
                      onClick={() => { setActiveFolder("unfiled"); setPage(0); }}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        activeFolder === "unfiled"
                          ? "bg-primary/15 text-primary"
                          : "text-text-muted hover:bg-surface-lighter hover:text-white"
                      }`}
                      data-testid="folder-unfiled"
                    >
                      <span className="text-xs">&#128196;</span>
                      Unfiled
                      <span className="ml-auto text-xs opacity-60">
                        {projects.filter((p) => !p.folderId).length}
                      </span>
                    </button>

                    {/* User folders */}
                    {folders?.map((folder) => (
                      <div key={folder._id} className="relative">
                        {editingFolderId === folder._id ? (
                          <div className="flex items-center gap-1 px-1">
                            <input
                              autoFocus
                              value={editingFolderName}
                              onChange={(e) => setEditingFolderName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameFolder(folder._id);
                                if (e.key === "Escape") setEditingFolderId(null);
                              }}
                              onBlur={() => handleRenameFolder(folder._id)}
                              className="w-full rounded border border-primary bg-surface px-1.5 py-1 text-sm text-white outline-none"
                              data-testid="folder-rename-input"
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => { setActiveFolder(folder._id); setPage(0); }}
                            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                              activeFolder === folder._id
                                ? "bg-primary/15 text-primary"
                                : "text-text-muted hover:bg-surface-lighter hover:text-white"
                            }`}
                            data-testid={`folder-${folder._id}`}
                          >
                            <span
                              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: folder.color || FOLDER_COLORS[0] }}
                            />
                            <span className="truncate">{folder.name}</span>
                            <span className="ml-auto text-xs opacity-60">
                              {projects.filter((p) => p.folderId === folder._id).length}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFolderMenuId(folderMenuId === folder._id ? null : folder._id);
                              }}
                              className="ml-0.5 rounded p-0.5 text-xs opacity-0 group-hover:opacity-100 hover:bg-surface-lighter"
                              style={{ opacity: folderMenuId === folder._id ? 1 : undefined }}
                              data-testid="folder-menu-btn"
                            >
                              &#8943;
                            </button>
                          </button>
                        )}

                        {/* Folder context menu */}
                        {folderMenuId === folder._id && (
                          <div className="absolute left-full top-0 z-20 ml-1 w-36 rounded-lg border border-surface-lighter bg-surface-light p-1 shadow-lg" data-testid="folder-menu">
                            <button
                              onClick={() => {
                                setEditingFolderId(folder._id);
                                setEditingFolderName(folder.name);
                                setFolderMenuId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-text-muted hover:bg-surface-lighter hover:text-white"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => {
                                setShowColorPicker(folder._id);
                                setFolderMenuId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-text-muted hover:bg-surface-lighter hover:text-white"
                            >
                              Change Color
                            </button>
                            <button
                              onClick={() => handleDeleteFolder(folder._id)}
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-danger hover:bg-danger/10"
                              data-testid="folder-delete-btn"
                            >
                              Delete
                            </button>
                          </div>
                        )}

                        {/* Color picker */}
                        {showColorPicker === folder._id && (
                          <div className="absolute left-full top-0 z-20 ml-1 rounded-lg border border-surface-lighter bg-surface-light p-2 shadow-lg" data-testid="folder-color-picker">
                            <div className="flex gap-1.5">
                              {FOLDER_COLORS.map((color) => (
                                <button
                                  key={color}
                                  onClick={async () => {
                                    await updateFolderColor({ id: folder._id as any, color });
                                    setShowColorPicker(null);
                                  }}
                                  className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${
                                    folder.color === color ? "border-white" : "border-transparent"
                                  }`}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* New folder input */}
                    {showNewFolder ? (
                      <div className="flex items-center gap-1 px-1 pt-1">
                        <input
                          autoFocus
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreateFolder();
                            if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); }
                          }}
                          placeholder="Folder name"
                          className="w-full rounded border border-primary bg-surface px-1.5 py-1 text-sm text-white placeholder-text-muted outline-none"
                          data-testid="new-folder-input"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowNewFolder(true)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text-muted hover:bg-surface-lighter hover:text-white"
                        data-testid="create-folder-btn"
                      >
                        <span>+</span> New Folder
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Main content area */}
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-xl font-semibold text-white">
                    Your Projects
                    <span className="ml-2 text-sm font-normal text-text-muted">
                      ({allFilteredProjects.length}
                      {searchQuery || activeFolder || activeTagFilters.size > 0
                        ? ` of ${projects.length}`
                        : ""})
                    </span>
                  </h3>
                  {selectedProjects.size > 0 && (
                    <div className="flex items-center gap-2 flex-wrap" data-testid="batch-actions">
                      <span className="text-xs text-text-muted">
                        {selectedProjects.size} selected
                      </span>
                      <button
                        onClick={handleBatchDelete}
                        className="rounded-md bg-danger/20 px-3 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/30"
                      >
                        Delete Selected
                      </button>
                      {/* Batch move to folder */}
                      <div className="relative">
                        <button
                          onClick={() => { setShowBatchFolder(!showBatchFolder); setShowBatchTag(false); }}
                          className="rounded-md bg-surface-lighter px-3 py-1 text-xs font-medium text-text-muted transition-colors hover:text-white"
                          data-testid="batch-move-folder-btn"
                        >
                          Move to Folder
                        </button>
                        {showBatchFolder && (
                          <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-lg border border-surface-lighter bg-surface-light p-1 shadow-lg" data-testid="batch-folder-dropdown">
                            <button
                              onClick={() => handleBatchMoveToFolder(undefined)}
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-text-muted hover:bg-surface-lighter hover:text-white"
                            >
                              Remove from folder
                            </button>
                            {folders?.map((f) => (
                              <button
                                key={f._id}
                                onClick={() => handleBatchMoveToFolder(f._id)}
                                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-text-muted hover:bg-surface-lighter hover:text-white"
                              >
                                <span
                                  className="inline-block h-2 w-2 rounded-full"
                                  style={{ backgroundColor: f.color || FOLDER_COLORS[0] }}
                                />
                                {f.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Batch add tag */}
                      <div className="relative">
                        <button
                          onClick={() => { setShowBatchTag(!showBatchTag); setShowBatchFolder(false); }}
                          className="rounded-md bg-surface-lighter px-3 py-1 text-xs font-medium text-text-muted transition-colors hover:text-white"
                          data-testid="batch-add-tag-btn"
                        >
                          Add Tag
                        </button>
                        {showBatchTag && (
                          <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-lg border border-surface-lighter bg-surface-light p-2 shadow-lg" data-testid="batch-tag-dropdown">
                            <div className="flex gap-1">
                              <input
                                autoFocus
                                value={batchTagValue}
                                onChange={(e) => setBatchTagValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleBatchAddTag(); }}
                                placeholder="Tag name"
                                className="w-full rounded border border-surface-lighter bg-surface px-2 py-1 text-sm text-white placeholder-text-muted outline-none focus:border-primary"
                              />
                              <button
                                onClick={handleBatchAddTag}
                                className="shrink-0 rounded bg-primary px-2 py-1 text-xs font-medium text-white"
                              >
                                Add
                              </button>
                            </div>
                            {allTags.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {allTags.slice(0, 6).map((t) => (
                                  <button
                                    key={t}
                                    onClick={() => setBatchTagValue(t)}
                                    className="rounded-full bg-surface-lighter px-2 py-0.5 text-xs text-text-muted hover:text-white"
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedProjects(new Set())}
                        className="rounded-md bg-surface-lighter px-2 py-1 text-xs text-text-muted transition-colors hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
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
                  {/* Tag filter */}
                  {allTags.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowTagFilter(!showTagFilter)}
                        className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                          activeTagFilters.size > 0
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-surface-lighter bg-surface text-text-muted hover:text-white"
                        }`}
                        data-testid="tag-filter-btn"
                      >
                        Tags {activeTagFilters.size > 0 && `(${activeTagFilters.size})`}
                      </button>
                      {showTagFilter && (
                        <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-surface-lighter bg-surface-light p-2 shadow-lg" data-testid="tag-filter-dropdown">
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {allTags.map((tag) => (
                              <label key={tag} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface-lighter">
                                <input
                                  type="checkbox"
                                  checked={activeTagFilters.has(tag)}
                                  onChange={() => {
                                    setActiveTagFilters((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(tag)) next.delete(tag);
                                      else next.add(tag);
                                      return next;
                                    });
                                    setPage(0);
                                  }}
                                  className="h-3.5 w-3.5 accent-primary"
                                />
                                <span className="text-text-muted">{tag}</span>
                              </label>
                            ))}
                          </div>
                          {activeTagFilters.size > 0 && (
                            <button
                              onClick={() => { setActiveTagFilters(new Set()); setPage(0); }}
                              className="mt-1.5 w-full rounded px-2 py-1 text-xs text-text-muted hover:bg-surface-lighter hover:text-white"
                            >
                              Clear tag filters
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Active filter chips */}
              {(activeFolder || activeTagFilters.size > 0) && (
                <div className="mb-3 flex flex-wrap gap-1.5" data-testid="active-filters">
                  {activeFolder && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs text-primary">
                      {activeFolder === "unfiled"
                        ? "Unfiled"
                        : folders?.find((f) => f._id === activeFolder)?.name || "Folder"}
                      <button onClick={() => { setActiveFolder(null); setPage(0); }} className="ml-0.5 hover:text-white">&times;</button>
                    </span>
                  )}
                  {Array.from(activeTagFilters).map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs text-primary">
                      #{tag}
                      <button
                        onClick={() => {
                          setActiveTagFilters((prev) => {
                            const next = new Set(prev);
                            next.delete(tag);
                            return next;
                          });
                          setPage(0);
                        }}
                        className="ml-0.5 hover:text-white"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => {
                  const projectFolder = folders?.find((f) => f._id === project.folderId);
                  return (
                    <div
                      key={project._id}
                      className={`group cursor-pointer rounded-lg border bg-surface-light p-4 transition-colors hover:border-primary ${
                        selectedProjects.has(project._id)
                          ? "border-primary bg-primary/5"
                          : "border-surface-lighter"
                      }`}
                      onClick={() =>
                        navigate({
                          to: "/project/$id",
                          params: { id: project._id },
                        })
                      }
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedProjects.has(project._id)}
                            onChange={() => toggleProjectSelection(project._id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-3.5 w-3.5 shrink-0 accent-primary opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid="project-checkbox"
                            style={selectedProjects.has(project._id) ? { opacity: 1 } : undefined}
                          />
                          <h4 className="truncate font-medium text-white">
                            {project.name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {confirmDeleteId === project._id ? (
                            <>
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
                            </>
                          ) : (
                            <>
                              <button
                                className="rounded p-1 text-text-muted opacity-0 transition-opacity hover:bg-surface-lighter hover:text-primary group-hover:opacity-100"
                                onClick={() => handleDuplicateProject(project._id)}
                                title="Duplicate project"
                                data-testid="duplicate-project-btn"
                              >
                                &#8916;
                              </button>
                              <button
                                className="rounded p-1 text-text-muted opacity-0 transition-opacity hover:bg-surface-lighter hover:text-danger group-hover:opacity-100"
                                onClick={() => setConfirmDeleteId(project._id)}
                              >
                                &#10005;
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Folder badge */}
                      {projectFolder && (
                        <div className="mb-1.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: projectFolder.color || FOLDER_COLORS[0] }}
                          />
                          <span className="text-xs text-text-muted">{projectFolder.name}</span>
                        </div>
                      )}

                      {/* Tags */}
                      <div className="mb-1.5 flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {project.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="group/tag inline-flex items-center gap-0.5 rounded-full bg-surface-lighter px-2 py-0.5 text-xs text-text-muted hover:text-white cursor-pointer"
                            onClick={() => {
                              setActiveTagFilters(new Set([tag]));
                              setPage(0);
                            }}
                          >
                            #{tag}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveTag(project._id, tag);
                              }}
                              className="ml-0.5 hidden text-text-muted hover:text-danger group-hover/tag:inline"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                        {tagInput === project._id ? (
                          <div className="relative">
                            <input
                              autoFocus
                              value={tagInputValue}
                              onChange={(e) => setTagInputValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddTag(project._id, tagInputValue);
                                if (e.key === "Escape") { setTagInput(null); setTagInputValue(""); }
                              }}
                              onBlur={() => { setTagInput(null); setTagInputValue(""); }}
                              placeholder="tag"
                              className="w-20 rounded-full border border-primary bg-surface px-2 py-0.5 text-xs text-white placeholder-text-muted outline-none"
                              data-testid="tag-input"
                            />
                            {tagSuggestions.length > 0 && tagInputValue.trim() && (
                              <div className="absolute left-0 top-full z-20 mt-0.5 w-32 rounded-md border border-surface-lighter bg-surface-light p-0.5 shadow-lg">
                                {tagSuggestions.map((s) => (
                                  <button
                                    key={s}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleAddTag(project._id, s);
                                    }}
                                    className="flex w-full rounded px-2 py-1 text-left text-xs text-text-muted hover:bg-surface-lighter hover:text-white"
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => { setTagInput(project._id); setTagInputValue(""); }}
                            className="rounded-full bg-surface-lighter px-1.5 py-0.5 text-xs text-text-muted opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                            data-testid="add-tag-btn"
                          >
                            + tag
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
                  );
                })}
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
          </div>
        )}
      </main>
    </div>
  );
}
