import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import "../styles.css";
import { ThemeToggleButton } from "../components/ThemeToggle";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Video Editing Templates - ClipCut AI | Cleanup Presets & Workflows" },
      {
        name: "description",
        content:
          "Browse ready-to-use video cleanup templates for podcasts, YouTube videos, presentations, interviews, and more. One-click presets to remove filler words, silences, and repetitions.",
      },
      { name: "keywords", content: "video editing templates, filler word removal presets, podcast cleanup, YouTube video editor, presentation cleanup, interview editing" },
      { property: "og:title", content: "Video Editing Templates - ClipCut AI" },
      { property: "og:description", content: "Ready-to-use cleanup presets for podcasts, YouTube, presentations, and interviews. Remove filler words in one click." },
      { name: "twitter:title", content: "Video Editing Templates - ClipCut AI" },
      { name: "twitter:description", content: "Ready-to-use cleanup presets for podcasts, YouTube, presentations, and interviews." },
    ],
    links: [
      { rel: "canonical", href: "https://clipcut.ai/templates" },
    ],
  }),
  component: TemplatesPage,
});

type Template = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  settings: {
    silenceThreshold: number;
    minSilenceDuration: number;
    confidenceThreshold: number;
    fillerWords: string[];
    removeRepetitions: boolean;
  };
  useCases: string[];
  tip: string;
};

const TEMPLATES: Template[] = [
  {
    id: "podcast-clean",
    name: "Podcast Cleanup",
    description: "Optimized for conversational audio. Removes common filler words while preserving natural pauses that give your podcast its rhythm.",
    category: "Audio",
    icon: "\uD83C\uDFA7",
    settings: {
      silenceThreshold: -35,
      minSilenceDuration: 1.5,
      confidenceThreshold: 0.7,
      fillerWords: ["um", "uh", "like", "you know", "so", "basically", "actually", "right"],
      removeRepetitions: true,
    },
    useCases: ["Solo podcasts", "Interview podcasts", "Panel discussions", "Audio blogs"],
    tip: "For multi-speaker podcasts, enable Speaker Diarization first so ClipCut AI can clean each speaker independently.",
  },
  {
    id: "youtube-creator",
    name: "YouTube Creator",
    description: "Aggressive filler removal and tight silence trimming for fast-paced YouTube content. Keeps your audience engaged with a punchy editing style.",
    category: "Video",
    icon: "\uD83C\uDFAC",
    settings: {
      silenceThreshold: -30,
      minSilenceDuration: 0.8,
      confidenceThreshold: 0.6,
      fillerWords: ["um", "uh", "like", "so", "you know", "basically", "I mean", "kind of", "sort of"],
      removeRepetitions: true,
    },
    useCases: ["Tutorials", "Vlogs", "Product reviews", "Commentary videos", "Educational content"],
    tip: "Pair with AI Chapters to auto-generate YouTube-friendly chapter markers from your cleaned transcript.",
  },
  {
    id: "presentation-pro",
    name: "Presentation Pro",
    description: "Polished removal for business presentations. Eliminates verbal crutches while keeping deliberate pauses for emphasis and slide transitions.",
    category: "Business",
    icon: "\uD83D\uDCCA",
    settings: {
      silenceThreshold: -40,
      minSilenceDuration: 2.0,
      confidenceThreshold: 0.8,
      fillerWords: ["um", "uh", "so", "basically", "essentially", "you know", "right"],
      removeRepetitions: false,
    },
    useCases: ["Keynote recordings", "Webinar replays", "Training videos", "Sales demos", "Conference talks"],
    tip: "Use Content Repurpose after cleanup to auto-generate a blog post or email summary from your presentation.",
  },
  {
    id: "interview-edit",
    name: "Interview Editor",
    description: "Balanced cleanup that respects the conversational flow of interviews. Lighter touch on natural speech patterns, heavier on distracting fillers.",
    category: "Audio",
    icon: "\uD83C\uDF99\uFE0F",
    settings: {
      silenceThreshold: -38,
      minSilenceDuration: 2.0,
      confidenceThreshold: 0.75,
      fillerWords: ["um", "uh", "like", "you know"],
      removeRepetitions: false,
    },
    useCases: ["Podcast interviews", "Documentary interviews", "Job interview prep", "Research interviews"],
    tip: "Enable Collaborative Editing to share with your interviewee for review before publishing.",
  },
  {
    id: "lecture-cleanup",
    name: "Lecture & Course",
    description: "Designed for educational content. Preserves thoughtful pauses and emphasis while removing verbal filler that distracts students.",
    category: "Education",
    icon: "\uD83C\uDF93",
    settings: {
      silenceThreshold: -42,
      minSilenceDuration: 2.5,
      confidenceThreshold: 0.8,
      fillerWords: ["um", "uh", "so", "like", "basically", "you know", "okay so"],
      removeRepetitions: true,
    },
    useCases: ["Online courses", "University lectures", "Tutorial series", "Workshop recordings"],
    tip: "Use AI Summary to auto-generate study notes from the cleaned transcript for your students.",
  },
  {
    id: "social-short",
    name: "Social Media Shorts",
    description: "Maximum tightening for short-form vertical video. Removes all dead air and fillers for punchy TikTok, Reels, and Shorts content.",
    category: "Social",
    icon: "\u26A1",
    settings: {
      silenceThreshold: -25,
      minSilenceDuration: 0.5,
      confidenceThreshold: 0.5,
      fillerWords: ["um", "uh", "like", "so", "you know", "basically", "I mean", "kind of", "sort of", "actually", "literally", "right"],
      removeRepetitions: true,
    },
    useCases: ["TikTok", "Instagram Reels", "YouTube Shorts", "Twitter/X video clips"],
    tip: "After cleanup, use Clip Extractor to find the most engaging 15-60 second segments automatically.",
  },
  {
    id: "audiobook-narrator",
    name: "Audiobook Narrator",
    description: "Gentle cleanup for narration. Preserves dramatic pauses and pacing while removing only accidental verbal stumbles.",
    category: "Audio",
    icon: "\uD83D\uDCD6",
    settings: {
      silenceThreshold: -45,
      minSilenceDuration: 3.0,
      confidenceThreshold: 0.9,
      fillerWords: ["um", "uh"],
      removeRepetitions: true,
    },
    useCases: ["Audiobook recording", "Voice-over work", "Narration", "Guided meditation"],
    tip: "Use TTS Gap Filler to smoothly bridge any awkward cuts where repetitions were removed.",
  },
  {
    id: "meeting-recap",
    name: "Meeting Recap",
    description: "Quick cleanup for recorded meetings. Focuses on removing filler words to make meeting recordings easier to review and skim.",
    category: "Business",
    icon: "\uD83D\uDCDD",
    settings: {
      silenceThreshold: -35,
      minSilenceDuration: 2.0,
      confidenceThreshold: 0.65,
      fillerWords: ["um", "uh", "like", "so", "you know", "basically", "right", "I mean"],
      removeRepetitions: true,
    },
    useCases: ["Team meetings", "Client calls", "Stand-ups", "All-hands recordings"],
    tip: "Enable AI Chapters to auto-create an agenda-style breakdown of the meeting topics.",
  },
];

const CATEGORIES = ["All", "Video", "Audio", "Business", "Education", "Social"];

function TemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const filtered = selectedCategory === "All"
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === selectedCategory);

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-surface-lighter px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="text-xl font-bold text-white">
            ClipCut <span className="text-primary">AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/try"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
            >
              Try Free
            </Link>
            <ThemeToggleButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Video Cleanup Templates
          </h1>
          <p className="text-text-muted max-w-2xl mx-auto text-lg">
            Ready-to-use presets for every content type. Pick a template, upload your video, and get a
            polished result in minutes — no manual tuning required.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-primary text-white"
                  : "bg-surface-light text-text-muted hover:text-white hover:bg-surface-lighter"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => {
            const isExpanded = expandedTemplate === template.id;
            return (
              <div
                key={template.id}
                className={`rounded-xl border transition-all ${
                  isExpanded
                    ? "border-primary bg-surface-light shadow-lg shadow-primary/10"
                    : "border-surface-lighter bg-surface-light hover:border-primary/50"
                }`}
              >
                <button
                  className="w-full text-left p-5"
                  onClick={() => setExpandedTemplate(isExpanded ? null : template.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl" role="img" aria-label={template.name}>
                      {template.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-white">{template.name}</h2>
                        <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-text-muted">
                          {template.category}
                        </span>
                      </div>
                      <p className="text-sm text-text-muted mt-1 line-clamp-2">{template.description}</p>
                    </div>
                    <svg
                      className={`w-4 h-4 text-text-muted transition-transform flex-shrink-0 mt-1 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4 animate-fade-in">
                    <div className="border-t border-surface-lighter pt-4" />

                    {/* Settings Preview */}
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                        Cleanup Settings
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-surface p-2">
                          <span className="text-text-muted">Silence threshold</span>
                          <p className="text-white font-medium">{template.settings.silenceThreshold} dB</p>
                        </div>
                        <div className="rounded-lg bg-surface p-2">
                          <span className="text-text-muted">Min silence</span>
                          <p className="text-white font-medium">{template.settings.minSilenceDuration}s</p>
                        </div>
                        <div className="rounded-lg bg-surface p-2">
                          <span className="text-text-muted">Confidence</span>
                          <p className="text-white font-medium">{(template.settings.confidenceThreshold * 100).toFixed(0)}%</p>
                        </div>
                        <div className="rounded-lg bg-surface p-2">
                          <span className="text-text-muted">Repetitions</span>
                          <p className="text-white font-medium">{template.settings.removeRepetitions ? "Remove" : "Keep"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Filler Words */}
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                        Filler Words Targeted
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {template.settings.fillerWords.map((word) => (
                          <span
                            key={word}
                            className="rounded-full bg-filler/20 text-filler px-2.5 py-0.5 text-xs font-medium"
                          >
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Use Cases */}
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                        Best For
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {template.useCases.map((use) => (
                          <span
                            key={use}
                            className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium"
                          >
                            {use}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Pro Tip */}
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                      <p className="text-xs text-text-muted">
                        <span className="font-semibold text-primary">Pro tip: </span>
                        {template.tip}
                      </p>
                    </div>

                    {/* CTA */}
                    <Link
                      to="/try"
                      className="block w-full rounded-lg bg-primary py-2.5 text-center text-sm font-medium text-white hover:bg-primary-dark transition-colors"
                    >
                      Try This Template Free
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* SEO Content Section */}
        <section className="mt-16 space-y-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center">
            How ClipCut AI Templates Work
          </h2>

          <div className="space-y-6 text-text-muted">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                What are video cleanup templates?
              </h3>
              <p>
                Video cleanup templates are pre-configured settings that tell ClipCut AI how aggressively to
                remove filler words, silences, and repetitions from your videos. Each template is tuned for
                a specific content type — a podcast needs different treatment than a TikTok clip or a business presentation.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Why remove filler words from videos?
              </h3>
              <p>
                Studies show that speakers who use fewer filler words are perceived as more confident, credible, and
                prepared. Filler words like "um," "uh," "like," and "you know" can make up 5-20% of spoken words in
                unscripted content. Removing them makes your content more engaging and professional — viewers stay
                longer and your message lands harder.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Privacy-first video processing
              </h3>
              <p>
                Unlike cloud-based video editors, ClipCut AI processes your video entirely in the browser using
                FFmpeg WebAssembly. Your video file never leaves your device — only the transcript text is sent
                to the server for AI analysis. This makes ClipCut AI ideal for sensitive content like
                internal meetings, medical recordings, or legal depositions.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Custom presets for your workflow
              </h3>
              <p>
                While these templates are a great starting point, ClipCut AI lets you save your own custom presets.
                Fine-tune the silence threshold, filler word list, and confidence settings, then save them to
                your Presets Library for one-click access on future projects.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <div className="mt-16 text-center pb-8">
          <h2 className="text-xl font-bold text-white mb-3">
            Ready to clean up your videos?
          </h2>
          <p className="text-text-muted mb-5">
            No signup required. Upload a video and see the difference in minutes.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              to="/try"
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
            >
              Try Free — No Account Needed
            </Link>
            <Link
              to="/demo"
              className="rounded-lg border border-surface-lighter bg-surface-light px-6 py-2.5 text-sm font-medium text-text-muted hover:text-white transition-colors"
            >
              View Interactive Demo
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
