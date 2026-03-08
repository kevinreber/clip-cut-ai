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
      { title: "ClipCut AI - Smart Video Editor" },
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
