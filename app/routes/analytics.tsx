import { createFileRoute, Link } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import "../styles.css";
import { UserMenu } from "../components/UserMenu";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
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
          <p className="mb-4 text-text-muted">Sign in to view your analytics.</p>
          <Link to="/" className="text-primary hover:underline">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return <AnalyticsDashboard />;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

function StatCard({
  label,
  value,
  subtitle,
  testId,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  testId?: string;
}) {
  return (
    <div
      className="rounded-lg border border-surface-lighter bg-surface-light p-4"
      data-testid={testId}
    >
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-text-muted">{subtitle}</p>
      )}
    </div>
  );
}

function FillerBar({ word, count, maxCount }: { word: string; count: number; maxCount: number }) {
  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-right text-sm text-text-muted">
        {word}
      </span>
      <div className="flex-1">
        <div className="h-5 overflow-hidden rounded-full bg-surface-lighter">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <span className="w-10 text-sm font-medium text-white">{count}</span>
    </div>
  );
}

function TrendRow({
  project,
}: {
  project: {
    id: string;
    name: string;
    createdAt: number;
    totalWords: number;
    fillerWords: number;
    fillerPercentage: number;
    deletedWords: number;
    timeSaved: number;
    duration: number;
    wordsPerMinute: number;
  };
}) {
  return (
    <Link
      to="/project/$id"
      params={{ id: project.id }}
      className="flex items-center gap-4 rounded-lg border border-surface-lighter bg-surface-light p-3 transition-colors hover:border-primary"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{project.name}</p>
        <p className="text-xs text-text-muted">
          {new Date(project.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-4 text-xs">
        <div className="text-center">
          <p className="text-text-muted">Words</p>
          <p className="font-medium text-white">{project.totalWords.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-text-muted">Fillers</p>
          <p className={`font-medium ${project.fillerPercentage > 5 ? "text-warning" : "text-success"}`}>
            {project.fillerPercentage}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-text-muted">WPM</p>
          <p className="font-medium text-white">{project.wordsPerMinute}</p>
        </div>
        <div className="text-center">
          <p className="text-text-muted">Saved</p>
          <p className="font-medium text-success">{formatDuration(Math.round(project.timeSaved))}</p>
        </div>
      </div>
    </Link>
  );
}

function AnalyticsDashboard() {
  const analytics = useQuery(api.analytics.getAnalytics);

  if (analytics === undefined) {
    return (
      <div className="min-h-screen bg-surface">
        <header className="border-b border-surface-lighter px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-text-muted transition-colors hover:text-white">
                &larr; Dashboard
              </Link>
              <h1 className="text-xl font-bold text-white sm:text-2xl">Analytics</h1>
            </div>
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-lg border border-surface-lighter bg-surface-light"
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!analytics || analytics.analyzedProjects === 0) {
    return (
      <div className="min-h-screen bg-surface">
        <header className="border-b border-surface-lighter px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-text-muted transition-colors hover:text-white">
                &larr; Dashboard
              </Link>
              <h1 className="text-xl font-bold text-white sm:text-2xl">Analytics</h1>
            </div>
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="mt-16 text-center" data-testid="analytics-empty">
            <p className="mb-2 text-4xl">&#128202;</p>
            <h2 className="mb-2 text-xl font-bold text-white">No analytics yet</h2>
            <p className="mb-6 text-text-muted">
              Upload and analyze videos to see your speaking analytics here.
            </p>
            <Link
              to="/"
              className="inline-block rounded-lg bg-primary px-6 py-2 font-medium text-white transition-colors hover:bg-primary-hover"
            >
              Upload a Video
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-surface-lighter px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-text-muted transition-colors hover:text-white">
              &larr; Dashboard
            </Link>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Analytics</h1>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6" data-testid="analytics-dashboard">
        {/* Overview Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Projects"
            value={analytics.totalProjects}
            subtitle={`${analytics.analyzedProjects} analyzed`}
            testId="stat-total-projects"
          />
          <StatCard
            label="Words Transcribed"
            value={analytics.totalWords.toLocaleString()}
            subtitle={`${analytics.averageWpm} avg WPM`}
            testId="stat-total-words"
          />
          <StatCard
            label="Filler Words Found"
            value={analytics.totalFillerWords.toLocaleString()}
            subtitle={`${analytics.fillerPercentage}% of all words`}
            testId="stat-filler-words"
          />
          <StatCard
            label="Time Saved"
            value={formatDuration(analytics.timeSaved)}
            subtitle={`from ${analytics.totalDeletedWords.toLocaleString()} removed words`}
            testId="stat-time-saved"
          />
        </div>

        <div className="mb-8 grid gap-8 lg:grid-cols-2">
          {/* Top Filler Words */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-white">
              Top Filler Words
            </h2>
            {analytics.topFillerWords.length > 0 ? (
              <div className="space-y-2" data-testid="top-filler-words">
                {analytics.topFillerWords.map((fw) => (
                  <FillerBar
                    key={fw.word}
                    word={fw.word}
                    count={fw.count}
                    maxCount={analytics.topFillerWords[0].count}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No filler words detected yet.</p>
            )}
          </div>

          {/* Quick Stats */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-white">
              Speaking Insights
            </h2>
            <div className="space-y-3" data-testid="speaking-insights">
              <div className="flex items-center justify-between rounded-lg border border-surface-lighter bg-surface-light p-3">
                <span className="text-sm text-text-muted">Average Speaking Rate</span>
                <span className="font-medium text-white">{analytics.averageWpm} WPM</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-surface-lighter bg-surface-light p-3">
                <span className="text-sm text-text-muted">Total Recording Time</span>
                <span className="font-medium text-white">{formatDuration(analytics.totalDuration)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-surface-lighter bg-surface-light p-3">
                <span className="text-sm text-text-muted">Filler Word Rate</span>
                <span className={`font-medium ${analytics.fillerPercentage > 5 ? "text-warning" : "text-success"}`}>
                  {analytics.fillerPercentage}%
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-surface-lighter bg-surface-light p-3">
                <span className="text-sm text-text-muted">Clean-Up Efficiency</span>
                <span className="font-medium text-success">
                  {analytics.totalWords > 0
                    ? Math.round((analytics.totalDeletedWords / analytics.totalWords) * 100)
                    : 0}% removed
                </span>
              </div>
              {analytics.perProject.length >= 2 && (
                <div className="flex items-center justify-between rounded-lg border border-surface-lighter bg-surface-light p-3">
                  <span className="text-sm text-text-muted">Filler Trend</span>
                  <span
                    className={`font-medium ${
                      analytics.perProject[analytics.perProject.length - 1].fillerPercentage <
                      analytics.perProject[0].fillerPercentage
                        ? "text-success"
                        : "text-warning"
                    }`}
                  >
                    {analytics.perProject[analytics.perProject.length - 1].fillerPercentage <
                    analytics.perProject[0].fillerPercentage
                      ? "Improving"
                      : analytics.perProject[analytics.perProject.length - 1].fillerPercentage ===
                          analytics.perProject[0].fillerPercentage
                        ? "Stable"
                        : "Needs work"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Per-Project Breakdown */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">
            Project Breakdown
            <span className="ml-2 text-sm font-normal text-text-muted">
              ({analytics.perProject.length} projects)
            </span>
          </h2>
          <div className="space-y-2" data-testid="project-breakdown">
            {[...analytics.perProject].reverse().map((project) => (
              <TrendRow key={project.id} project={project} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
