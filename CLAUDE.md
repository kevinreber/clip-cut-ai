# CLAUDE.md — Project Instructions for Claude Code

## Project Overview

ClipCut AI is an AI-powered web-based video editor that removes filler words, silences, and repetitions from videos. Built with React 19 + TanStack Start, Convex backend, and client-side FFmpeg WASM processing.

## Key Commands

- `npm run dev` — Start Convex + Vite dev server
- `npm run build` — Production build
- `npm run test:e2e` — Run Playwright E2E tests

## Changelog Requirement

**IMPORTANT: Every PR and commit that adds, changes, or fixes user-facing functionality MUST include an update to `CHANGELOG.md`.**

- Follow the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format
- Add entries under `## [Unreleased]` at the top
- Use the appropriate section heading: `### Added`, `### Changed`, `### Fixed`, `### Removed`, `### Deprecated`, `### Security`
- Each entry should be a single line starting with `- ` describing the change from a user's perspective
- The `/changelog` page renders this file directly — keep entries clear and user-friendly

## Project Structure

- `app/routes/` — TanStack file-based routes
- `app/components/` — React components
- `app/lib/` — Utilities and hooks
- `convex/` — Backend functions and schema
- `e2e/` — Playwright tests

## Tech Stack

- React 19 + TanStack Start (Router + Query)
- Convex (database, file storage, auth, background actions)
- OpenAI Whisper API for transcription
- FFmpeg WASM for client-side video processing
- Tailwind CSS 4
- Vite 7
