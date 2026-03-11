import { createFileRoute, Link } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import "../styles.css";
import { UserMenu } from "../components/UserMenu";
import { StoryAssembly } from "../components/StoryAssembly";

export const Route = createFileRoute("/compilations")({
  component: CompilationsPage,
});

function CompilationsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <p className="mb-4 text-text-muted">Sign in to use AI Story Assembly</p>
          <Link
            to="/"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-surface-lighter px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xl font-bold text-white">
              ClipCut <span className="text-primary">AI</span>
            </Link>
            <span className="text-text-muted">/</span>
            <span className="text-sm text-text-muted">Story Assembly</span>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <StoryAssembly />
      </main>
    </div>
  );
}
