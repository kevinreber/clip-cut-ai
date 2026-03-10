import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useConvexAuth, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import "../styles.css";
import { AuthForm } from "../components/AuthForm";
import { UserMenu } from "../components/UserMenu";
import { useToast } from "../components/Toast";
import { ScreenRecorder } from "../components/ScreenRecorder";

export const Route = createFileRoute("/record")({
  component: RecordPage,
});

function RecordPage() {
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

  return <RecordPageContent />;
}

function RecordPageContent() {
  const navigate = useNavigate();
  const createProject = useMutation(api.projects.create);
  const generateUploadUrl = useMutation(api.projects.generateUploadUrl);
  const attachVideo = useMutation(api.projects.attachVideo);
  const analyzeVideo = useAction(api.analyze.analyzeVideo);
  const { addToast } = useToast();
  const [uploading, setUploading] = useState(false);

  async function handleRecordingComplete(blob: Blob, filename: string) {
    setUploading(true);
    try {
      const projectName = filename.replace(/\.[^/.]+$/, "");
      const projectId = await createProject({ name: projectName });

      const uploadUrl = await generateUploadUrl();

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const { storageId } = await response.json();

      await attachVideo({
        projectId,
        storageId: storageId as any,
      });

      addToast("Recording uploaded! Analyzing...", "success");

      // Start analysis in background
      analyzeVideo({ projectId: projectId as any }).catch(() => {
        // Analysis errors are shown in the project editor
      });

      navigate({ to: "/project/$id", params: { id: projectId } });
    } catch (err) {
      console.error("Upload failed:", err);
      addToast("Failed to upload recording. Please try again.", "error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-surface-lighter px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-text-muted transition-colors hover:text-white"
            >
              &larr;
            </Link>
            <h1 className="text-xl font-bold text-white sm:text-2xl">
              Screen Recorder
            </h1>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-white sm:text-3xl">
            Record &amp; Edit
          </h2>
          <p className="text-text-muted">
            Capture your screen or camera, then clean up the recording with AI —
            all in one place.
          </p>
        </div>

        {uploading && (
          <div
            data-testid="upload-progress"
            className="mb-6 flex items-center justify-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3"
          >
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-white">
              Uploading recording and creating project...
            </span>
          </div>
        )}

        <ScreenRecorder onRecordingComplete={handleRecordingComplete} />
      </main>
    </div>
  );
}
