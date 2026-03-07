import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRef, useState } from "react";
import "../styles.css";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const projects = useQuery(api.projects.list);
  const createProject = useMutation(api.projects.create);
  const generateUploadUrl = useMutation(api.projects.generateUploadUrl);
  const attachVideo = useMutation(api.projects.attachVideo);
  const deleteProject = useMutation(api.projects.deleteProject);
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

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
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-surface-lighter px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-2xl font-bold text-white">
            ClipCut <span className="text-primary">AI</span>
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-4xl font-bold text-white">
            Remove filler words instantly
          </h2>
          <p className="text-lg text-text-muted">
            Upload a video and let AI detect ums, uhs, silences, and
            repetitions. Edit your transcript to cut your video.
          </p>
        </div>

        <div className="mb-12 flex justify-center">
          <label
            className={`flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-16 py-12 transition-colors ${
              uploading
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
                  Upload a video to get started
                </p>
                <p className="text-sm text-text-muted">
                  MP4, MOV, WebM supported
                </p>
              </>
            )}
          </label>
        </div>

        {projects && projects.length > 0 && (
          <div>
            <h3 className="mb-4 text-xl font-semibold text-white">
              Your Projects
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
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
                    <button
                      className="rounded p-1 text-text-muted opacity-0 transition-opacity hover:bg-surface-lighter hover:text-danger group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this project?")) {
                          deleteProject({ id: project._id });
                        }
                      }}
                    >
                      &#10005;
                    </button>
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
          </div>
        )}
      </main>
    </div>
  );
}
