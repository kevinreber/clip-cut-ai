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
      { name: "msapplication-TileColor", content: "#ffffff" },
      { name: "msapplication-TileImage", content: "/ms-icon-144x144.png" },
      { name: "theme-color", content: "#ffffff" },
    ],
    links: [
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "96x96", href: "/favicon-96x96.png" },
      { rel: "apple-touch-icon", sizes: "57x57", href: "/apple-icon-57x57.png" },
      { rel: "apple-touch-icon", sizes: "60x60", href: "/apple-icon-60x60.png" },
      { rel: "apple-touch-icon", sizes: "72x72", href: "/apple-icon-72x72.png" },
      { rel: "apple-touch-icon", sizes: "76x76", href: "/apple-icon-76x76.png" },
      { rel: "apple-touch-icon", sizes: "114x114", href: "/apple-icon-114x114.png" },
      { rel: "apple-touch-icon", sizes: "120x120", href: "/apple-icon-120x120.png" },
      { rel: "apple-touch-icon", sizes: "144x144", href: "/apple-icon-144x144.png" },
      { rel: "apple-touch-icon", sizes: "152x152", href: "/apple-icon-152x152.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-icon-180x180.png" },
      { rel: "manifest", href: "/manifest.json" },
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
