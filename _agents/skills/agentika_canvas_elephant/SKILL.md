---
name: agentika-canvas-elephant
description: >-
  Project context loader for the agentika-canvas codebase. Load this skill
  at the start of any Elephant design session (egm-brainstorm, egm-draft,
  egm-review) to quickly give the agent accurate context about the
  programmatic video framework, its core invariants, and key code paths.
---

# agentika-canvas — Elephant Project Context

You are working on **agentika-canvas**: a programmatic video generation
framework that renders 1920x1080 video 100% in the browser using HTML5 Canvas
+ WebCodecs API (hardware-accelerated VideoEncoder) + Mediabunny muxing.
Total server cost: $0.

## Canonical Documents (read these first)

- `PRD.md` — product requirements, FR-01..FR-06, codec table (avc1.4d0034,
  vp09.00.40.08.00, av01.0.04M.08, mp4a.40.2, opus).
- `ROADMAP.md` — 7-phase roadmap (all phases implemented as of v1.0.0).
- `ARCHITECTURE_ANALYSIS.md` — architecture decisions and phase matrix.
- `docs/designs/SITEMAP.md` — index of design artifacts (EGM artifact
  directory is `docs/designs/`).
- `.antigravity/rules.md` — mandatory engineering doctrines (anti-AI slop).

## Core Invariants (never violate in a design)

1. **Deterministic timeline**: every animation property is a pure function of
   frame index `i`; `timestampUs = (i * 1e6) / fps`. No setTimeout /
   wall-clock in animation logic.
2. **Dynamic z-index**: window stacking is managed by
   `SceneGraph.focusWindow(layerId)` (maxZCap 900000 keeps windows below the
   cursor). Never re-order JSX/DOM to change stacking.
3. **$0 server rendering**: export path is Dedicated Web Worker +
   OffscreenCanvas + VideoEncoder + Mediabunny BufferTarget → browser
   download. No FFmpeg, no Puppeteer, no cloud render.
4. **Anti-AI slop**: realistic macOS desktop, real GitHub UI with animated
   stars counter, presenter webcam with audio waveforms, vector Mac cursor
   (default/pointer/nwse-resize with humanSmooth easing), controlled low-
   frequency camera shake (≤ 2px translation, ≤ 0.0015 rad rotation).
5. **Memory safety**: `VideoFrame.close()` / `VideoSample.close()` after use;
   LRU sample cache (30 entries) in MediaIngestion.

## Key Code Paths

- `src/core/Engine.ts` — main render loop, realtime + deterministic step modes.
- `src/core/SceneGraph.ts` — CanvasLayer registry, renderFrame, focusWindow.
- `src/core/Timeline.ts` — interpolate/interpolatePoint + easing library.
- `src/core/Camera.ts` — harmonic multi-sine shake transform.
- `src/kits/macos/` — desktop, window, webcam, cursor layers.
- `src/kits/github/GitHubRepoLayer.ts` — GitHub UI + stars counter.
- `src/kits/quiz/QuizTemplateLayer.ts` — database-driven quiz template.
- `src/media/Exporter.worker.ts` + `MediaExporter.ts` — MP4 export pipeline.
- `src/media/MediaIngestion.ts` — Mediabunny precision reader + WASM demuxer.
- `src/studio/EditorApp.tsx` + `FrameInspector.tsx` — studio UI, scrubber,
  AI revision prompt logger.
- `cli/index.ts` — script-to-scene automation (generate-scene, inspect-script,
  batch-quiz).
- `tests/phaseN_verification.ts` — per-phase test suites (all must pass).

## Conventions

- New features with design decisions → EGM flow (`/egm:egm-brainstorm` →
  `/egm:egm-draft` → `/egm:egm-review`) before implementation; approved
  designs live in `docs/designs/` and are indexed in `SITEMAP.md`.
- Every feature ships with a test suite in `tests/` and a `CHANGELOG.md`
  entry; `npm run build` (tsc strict) must be green before commit.
