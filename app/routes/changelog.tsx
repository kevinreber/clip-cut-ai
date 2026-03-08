import { createFileRoute, Link } from "@tanstack/react-router";
import { ThemeToggleButton } from "../components/ThemeToggle";
import changelogRaw from "../../CHANGELOG.md?raw";

export const Route = createFileRoute("/changelog")({
  component: ChangelogPage,
});

type ChangelogEntry = {
  version: string;
  date: string;
  sections: { heading: string; items: string[] }[];
};

function parseChangelog(raw: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const lines = raw.split("\n");
  let current: ChangelogEntry | null = null;
  let currentSection: { heading: string; items: string[] } | null = null;

  for (const line of lines) {
    // Match version headers like "## [1.0.0] - 2026-03-08" or "## [Unreleased]"
    const versionMatch = line.match(
      /^## \[([^\]]+)\](?:\s*-\s*(.+))?/,
    );
    if (versionMatch) {
      if (current) entries.push(current);
      current = {
        version: versionMatch[1],
        date: versionMatch[2]?.trim() || "",
        sections: [],
      };
      currentSection = null;
      continue;
    }

    // Match section headers like "### Added"
    const sectionMatch = line.match(/^### (.+)/);
    if (sectionMatch && current) {
      currentSection = { heading: sectionMatch[1], items: [] };
      current.sections.push(currentSection);
      continue;
    }

    // Match list items like "- Something"
    const itemMatch = line.match(/^- (.+)/);
    if (itemMatch && currentSection) {
      currentSection.items.push(itemMatch[1]);
    }
  }

  if (current) entries.push(current);
  return entries;
}

const sectionColors: Record<string, { badge: string; bullet: string }> = {
  Added: { badge: "bg-success/15 text-success", bullet: "bg-success" },
  Changed: { badge: "bg-primary/15 text-primary", bullet: "bg-primary" },
  Fixed: { badge: "bg-warning/15 text-warning", bullet: "bg-warning" },
  Removed: { badge: "bg-danger/15 text-danger", bullet: "bg-danger" },
  Deprecated: {
    badge: "bg-text-muted/15 text-text-muted",
    bullet: "bg-text-muted",
  },
  Security: { badge: "bg-warning/15 text-warning", bullet: "bg-warning" },
};

function ChangelogPage() {
  const entries = parseChangelog(changelogRaw);

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-surface-lighter px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center gap-2 sm:gap-4">
          <Link
            to="/"
            className="shrink-0 text-text-muted transition-colors hover:text-white"
          >
            &larr; <span className="hidden sm:inline">Home</span>
          </Link>
          <h1 className="text-base font-semibold text-white sm:text-lg">
            Changelog
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            What&rsquo;s New
          </h2>
          <p className="mt-2 text-text-muted">
            New features, improvements, and fixes for ClipCut AI.
          </p>
        </div>

        <div className="space-y-8">
          {entries.map((entry) => (
            <article
              key={entry.version}
              className="rounded-lg border border-surface-lighter bg-surface-light p-6"
            >
              <div className="mb-4 flex items-baseline gap-3">
                <h3 className="text-lg font-bold text-white">
                  {entry.version === "Unreleased"
                    ? "Unreleased"
                    : `v${entry.version}`}
                </h3>
                {entry.date && (
                  <span className="text-sm text-text-muted">{entry.date}</span>
                )}
                {entry.version === "Unreleased" && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                    Coming Soon
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {entry.sections.map((section) => {
                  const colors = sectionColors[section.heading] || {
                    badge: "bg-text-muted/15 text-text-muted",
                    bullet: "bg-text-muted",
                  };
                  return (
                    <div key={section.heading}>
                      <span
                        className={`mb-2 inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${colors.badge}`}
                      >
                        {section.heading}
                      </span>
                      <ul className="space-y-1.5">
                        {section.items.map((item, i) => (
                          <li key={i} className="flex gap-2 text-sm">
                            <span
                              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${colors.bullet}`}
                            />
                            <span className="text-text-muted">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
