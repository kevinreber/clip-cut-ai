import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { AuthForm } from "./AuthForm";

function useAnimateOnScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

function WaveformDemo() {
  const bars = [0.4, 0.7, 0.3, 0.9, 0.5, 0.8, 0.35, 0.6, 0.95, 0.45, 0.75, 0.3, 0.85, 0.5, 0.7, 0.4, 0.6, 0.9, 0.35, 0.8];
  const fillerIndices = new Set([3, 4, 5, 12, 13]);

  return (
    <div className="flex items-end justify-center gap-[3px] h-16">
      {bars.map((height, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full animate-waveform-bar ${
            fillerIndices.has(i)
              ? "bg-filler/70"
              : "bg-primary/60"
          }`}
          style={{
            height: `${height * 100}%`,
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}

function TranscriptDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s: number) => (s + 1) % 3);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const words = [
    { text: "So", type: "normal" },
    { text: "today", type: "normal" },
    { text: "um", type: "filler" },
    { text: "we're", type: "normal" },
    { text: "going", type: "normal" },
    { text: "to", type: "normal" },
    { text: "uh", type: "filler" },
    { text: "talk", type: "normal" },
    { text: "about", type: "normal" },
    { text: "like", type: "filler" },
    { text: "the", type: "normal" },
    { text: "new", type: "normal" },
    { text: "features", type: "normal" },
  ];

  return (
    <div className="rounded-lg border border-surface-lighter bg-surface p-4 font-mono text-sm leading-relaxed">
      <div className="flex flex-wrap gap-x-1.5 gap-y-1">
        {words.map((word, i) => (
          <span
            key={i}
            className={`rounded px-1 py-0.5 transition-all duration-300 ${
              word.type === "filler"
                ? step >= 1
                  ? "bg-filler/20 text-filler line-through"
                  : "text-text"
                : step >= 2
                  ? "text-white"
                  : "text-text"
            }`}
          >
            {word.text}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
        <span className={`inline-block h-2 w-2 rounded-full transition-colors duration-300 ${
          step === 0 ? "bg-primary" : step === 1 ? "bg-filler" : "bg-success"
        }`} />
        {step === 0
          ? "Transcribing..."
          : step === 1
            ? "Filler words detected"
            : "Clean transcript ready"}
      </div>
    </div>
  );
}

const features = [
  {
    icon: "&#9889;",
    title: "AI-Powered Detection",
    description:
      "Automatically identifies ums, uhs, long silences, and repeated phrases in your video.",
  },
  {
    icon: "&#9998;",
    title: "Visual Transcript Editor",
    description:
      "Click words to delete them. See your edits in real-time on the interactive timeline.",
  },
  {
    icon: "&#127916;",
    title: "Client-Side Export",
    description:
      "Videos are processed in your browser using FFmpeg WASM. Your content never leaves your device.",
  },
  {
    icon: "&#128196;",
    title: "Subtitle Export",
    description:
      "Export clean subtitles in SRT, VTT, or plain text format from your edited transcript.",
  },
  {
    icon: "&#8617;",
    title: "Undo & Redo",
    description:
      "Full history tracking so you can experiment freely and revert any changes instantly.",
  },
  {
    icon: "&#9729;",
    title: "Cloud Projects",
    description:
      "Save projects to the cloud. Pick up where you left off from any device.",
  },
];

const steps = [
  {
    number: "1",
    title: "Upload your video",
    description: "Drop any MP4, MOV, or WebM file. Supports files up to 500MB.",
  },
  {
    number: "2",
    title: "AI analyzes your speech",
    description:
      "Our AI transcribes and detects filler words, silences, and repetitions.",
  },
  {
    number: "3",
    title: "Edit & export",
    description:
      "Review the transcript, toggle deletions, and export a clean video.",
  },
];

export function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);
  const featuresAnim = useAnimateOnScroll();
  const demoAnim = useAnimateOnScroll();
  const stepsAnim = useAnimateOnScroll();
  const ctaAnim = useAnimateOnScroll();

  if (showAuth) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowAuth(false)}
          className="absolute left-4 top-4 z-10 rounded-lg border border-surface-lighter bg-surface-light px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-white"
        >
          &larr; Back
        </button>
        <AuthForm />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Navigation */}
      <nav className="border-b border-surface-lighter/50 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-xl font-bold text-white sm:text-2xl">
            ClipCut <span className="text-primary">AI</span>
          </h1>
          <div className="flex items-center gap-3">
            <Link
              to="/demo"
              className="hidden text-sm text-text-muted transition-colors hover:text-white sm:inline"
            >
              Demo
            </Link>
            <Link
              to="/try"
              className="hidden text-sm text-text-muted transition-colors hover:text-white sm:inline"
            >
              Free Trial
            </Link>
            <Link
              to="/changelog"
              className="hidden text-sm text-text-muted transition-colors hover:text-white sm:inline"
            >
              Changelog
            </Link>
            <button
              onClick={() => setShowAuth(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="animate-fade-up">
            <span className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary sm:text-sm">
              AI-Powered Video Editing
            </span>
          </div>
          <h2 className="animate-fade-up stagger-1 mb-6 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Remove filler words
            <br />
            <span className="text-primary">instantly</span>
          </h2>
          <p className="animate-fade-up stagger-2 mx-auto mb-10 max-w-2xl text-lg text-text-muted sm:text-xl">
            Upload a video and let AI detect{" "}
            <span className="text-filler font-medium">ums</span>,{" "}
            <span className="text-filler font-medium">uhs</span>, long
            silences, and repetitions. Edit the transcript, export a clean
            video.
          </p>
          <div className="animate-fade-up stagger-3 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Link
              to="/try"
              className="w-full rounded-lg bg-primary px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-dark sm:w-auto"
            >
              Try Free &mdash; No Account Needed
            </Link>
            <Link
              to="/demo"
              className="w-full rounded-lg border border-surface-lighter bg-surface-light px-8 py-3 text-base font-medium text-white transition-colors hover:border-primary sm:w-auto"
            >
              View Demo
            </Link>
          </div>

          {/* Animated waveform visual */}
          <div className="animate-fade-up stagger-4 mt-14">
            <div className="mx-auto max-w-lg rounded-xl border border-surface-lighter bg-surface-light p-6 shadow-lg shadow-black/20">
              <WaveformDemo />
              <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
                <span>00:00</span>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-primary/60" />
                  <span>Clean</span>
                  <span className="inline-block h-2 w-2 rounded-full bg-filler/70" />
                  <span>Filler</span>
                </div>
                <span>02:34</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section
        ref={featuresAnim.ref}
        className="border-t border-surface-lighter/50 bg-surface-light/30 px-4 py-16 sm:px-6 sm:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <div
            className={`mb-12 text-center ${
              featuresAnim.isVisible ? "animate-fade-up" : "opacity-0"
            }`}
          >
            <h3 className="mb-3 text-2xl font-bold text-white sm:text-3xl">
              Everything you need to clean up your videos
            </h3>
            <p className="text-text-muted">
              Powerful tools, zero learning curve.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <div
                key={i}
                className={`rounded-xl border border-surface-lighter bg-surface-light p-6 transition-colors hover:border-primary/50 ${
                  featuresAnim.isVisible
                    ? `animate-fade-up stagger-${i + 1}`
                    : "opacity-0"
                }`}
              >
                <div
                  className="mb-3 text-2xl"
                  dangerouslySetInnerHTML={{ __html: feature.icon }}
                />
                <h4 className="mb-2 font-semibold text-white">
                  {feature.title}
                </h4>
                <p className="text-sm leading-relaxed text-text-muted">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo Preview */}
      <section
        ref={demoAnim.ref}
        className="border-t border-surface-lighter/50 px-4 py-16 sm:px-6 sm:py-24"
      >
        <div className="mx-auto max-w-4xl">
          <div
            className={`mb-10 text-center ${
              demoAnim.isVisible ? "animate-fade-up" : "opacity-0"
            }`}
          >
            <h3 className="mb-3 text-2xl font-bold text-white sm:text-3xl">
              See it in action
            </h3>
            <p className="text-text-muted">
              Watch how ClipCut AI detects and highlights filler words
              automatically.
            </p>
          </div>
          <div
            className={`${
              demoAnim.isVisible ? "animate-fade-in-scale stagger-2" : "opacity-0"
            }`}
          >
            <TranscriptDemo />
            <p className="mt-4 text-center text-sm text-text-muted">
              <Link
                to="/demo"
                className="text-primary hover:underline"
              >
                Try the full interactive demo &rarr;
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        ref={stepsAnim.ref}
        className="border-t border-surface-lighter/50 bg-surface-light/30 px-4 py-16 sm:px-6 sm:py-24"
      >
        <div className="mx-auto max-w-4xl">
          <div
            className={`mb-12 text-center ${
              stepsAnim.isVisible ? "animate-fade-up" : "opacity-0"
            }`}
          >
            <h3 className="mb-3 text-2xl font-bold text-white sm:text-3xl">
              How it works
            </h3>
            <p className="text-text-muted">
              Three steps to a cleaner video.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`text-center ${
                  stepsAnim.isVisible
                    ? `animate-fade-up stagger-${i + 1}`
                    : "opacity-0"
                }`}
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-xl font-bold text-primary">
                  {step.number}
                </div>
                <h4 className="mb-2 font-semibold text-white">{step.title}</h4>
                <p className="text-sm text-text-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        ref={ctaAnim.ref}
        className="border-t border-surface-lighter/50 px-4 py-16 sm:px-6 sm:py-24"
      >
        <div
          className={`mx-auto max-w-2xl text-center ${
            ctaAnim.isVisible ? "animate-fade-up" : "opacity-0"
          }`}
        >
          <h3 className="mb-4 text-2xl font-bold text-white sm:text-3xl">
            Ready to clean up your videos?
          </h3>
          <p className="mb-8 text-text-muted">
            No account required to try. Upload a video and see the magic.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Link
              to="/try"
              className="w-full rounded-lg bg-primary px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-dark sm:w-auto"
            >
              Get Started Free
            </Link>
            <button
              onClick={() => setShowAuth(true)}
              className="w-full rounded-lg border border-surface-lighter bg-surface-light px-8 py-3 text-base font-medium text-white transition-colors hover:border-primary sm:w-auto"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-lighter/50 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-text-muted">
            ClipCut <span className="text-primary">AI</span> &mdash; Smart
            video editing powered by AI
          </p>
          <div className="flex items-center gap-4 text-sm text-text-muted">
            <Link to="/demo" className="hover:text-white">
              Demo
            </Link>
            <Link to="/try" className="hover:text-white">
              Free Trial
            </Link>
            <Link to="/changelog" className="hover:text-white">
              Changelog
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
