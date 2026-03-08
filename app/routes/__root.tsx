import {
  Outlet,
  ScrollRestoration,
  createRootRoute,
} from "@tanstack/react-router";
import { HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ConvexClientProvider } from "../convex";
import { ToastProvider } from "../components/Toast";
import { ThemeProvider } from "../components/ThemeToggle";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ClipCut AI - Remove Filler Words from Videos Instantly" },
      {
        name: "description",
        content:
          "AI-powered video editor that automatically detects and removes ums, uhs, silences, and repetitions. Edit transcripts visually, export clean videos in your browser.",
      },
      { name: "keywords", content: "video editor, filler words, remove ums, AI video editing, transcript editor, clean video, subtitle export" },
      { property: "og:title", content: "ClipCut AI - Remove Filler Words from Videos Instantly" },
      { property: "og:description", content: "Upload a video and let AI detect ums, uhs, long silences, and repetitions. Edit the transcript and export a clean video — all in your browser." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "ClipCut AI" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ClipCut AI - Remove Filler Words from Videos Instantly" },
      { name: "twitter:description", content: "AI-powered video editor that removes filler words, silences, and repetitions. Try free — no account needed." },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <ConvexClientProvider>
        <ThemeProvider>
          <ToastProvider>
            <Outlet />
          </ToastProvider>
        </ThemeProvider>
      </ConvexClientProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
