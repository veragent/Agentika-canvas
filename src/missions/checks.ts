/**
 * agentika-canvas: Mission deterministic checks
 *
 * Every check runs WITHOUT a real canvas: the scene graph is driven through a
 * recording proxy context (no-op drawing, numeric-argument scanning) so the
 * pipeline works identically in Node (CLI/CI) and in the browser. Pixel-level
 * checks are only possible when the caller injects a pixelProbe hook.
 */

import { SceneBundle } from '../core/SceneBundle';
import { RenderContext } from '../core/SceneGraph';
import { frameToTimestampUs } from '../core/Timeline';
import { MissionCheckResult, FrameEvidence, CheckSeverity } from './types';

/** SceneGraph system-overlay ceiling (cursor sits above this). */
export const MISSION_MAX_Z_CAP = 900000;
/** Upper sanity bound for window layers (runaway focusWindow growth). */
const WINDOW_Z_SANITY_MAX = 100000;
/** Overlay layers (zIndex >= cap) allowed per scene (cursor, system HUD). */
const MAX_OVERLAY_LAYERS = 3;

const NAN_SCAN = (args: unknown[]): number => {
  let nan = 0;
  for (const a of args) {
    if (typeof a === 'number' && !Number.isFinite(a)) {
      nan++;
    } else if (Array.isArray(a)) {
      nan += NAN_SCAN(a);
    }
  }
  return nan;
};

/**
 * Recording canvas context: counts actual drawing operations and flags any
 * NaN/Infinity passed into geometry/text/transform arguments.
 */
export interface TrackingStats {
  drawCalls: number;
  nanCalls: number;
}

export function createTrackingContext(width: number, height: number): {
  ctx: RenderContext['ctx'];
  stats: TrackingStats;
} {
  const stats: TrackingStats = { drawCalls: 0, nanCalls: 0 };

  const counting = (...methods: string[]): Record<string, (...args: unknown[]) => void> => {
    const out: Record<string, (...args: unknown[]) => void> = {};
    for (const m of methods) {
      out[m] = (...args: unknown[]) => {
        stats.nanCalls += NAN_SCAN(args);
      };
    }
    return out;
  };

  const drawing = (...methods: string[]): Record<string, (...args: unknown[]) => void> => {
    const out: Record<string, (...args: unknown[]) => void> = {};
    for (const m of methods) {
      out[m] = (...args: unknown[]) => {
        stats.drawCalls++;
        stats.nanCalls += NAN_SCAN(args);
      };
    }
    return out;
  };

  const ctx = {
    // state
    save: () => {},
    restore: () => {},
    // path building (NaN-scan only — beginPath alone draws nothing)
    ...counting(
      'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'arc', 'arcTo',
      'ellipse', 'rect', 'roundRect', 'setLineDash'
    ),
    // transforms (NaN here corrupts every later draw)
    ...counting('translate', 'rotate', 'scale', 'transform', 'setTransform'),
    // actual drawing ops
    ...drawing(
      'fillRect', 'strokeRect', 'clearRect', 'fillText', 'strokeText',
      'fill', 'stroke', 'drawImage', 'putImageData'
    ),
    beginPath: () => {},
    closePath: () => {},
    clip: () => {},
    isPointInPath: () => false,
    measureText: (): { width: number } => ({ width: 0 }),
    createLinearGradient: (): { addColorStop: () => void } => ({ addColorStop: () => {} }),
    createRadialGradient: (): { addColorStop: () => void } => ({ addColorStop: () => {} }),
    createPattern: (): null => null,
    getImageData: (): { data: Uint8ClampedArray; width: number; height: number } => ({
      data: new Uint8ClampedArray(4),
      width: 1,
      height: 1,
    }),
    // style properties are assigned freely by layers
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    font: '14px monospace',
    globalAlpha: 1,
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'top' as CanvasTextBaseline,
    lineCap: 'butt' as CanvasLineCap,
    lineJoin: 'miter' as CanvasLineJoin,
    shadowBlur: 0,
    shadowColor: 'rgba(0,0,0,0)',
  } as unknown as RenderContext['ctx'];

  // widen the stats object with width/height bookkeeping (unused by layers)
  void width;
  void height;

  return { ctx, stats };
}

/** Evenly-spaced frame indices, always including 0 and the final frame. */
export function sampleFrameIndices(totalFrames: number, count: number): number[] {
  if (totalFrames <= 0) return [];
  const n = Math.max(1, Math.min(count, totalFrames));
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const raw = Math.round((i / (n - 1 || 1)) * (totalFrames - 1));
    const f = Math.max(0, Math.min(totalFrames - 1, raw));
    if (!idx.includes(f)) idx.push(f);
  }
  return idx;
}

/** Shallow scan (depth ≤ 2) of a layer's numeric fields for non-finite values. */
function scanLayerState(layer: object): string[] {
  const problems: string[] = [];
  const queue: Array<{ value: unknown; path: string; depth: number }> = [
    { value: layer, path: '', depth: 0 },
  ];
  while (queue.length) {
    const { value, path, depth } = queue.shift() as { value: unknown; path: string; depth: number };
    if (depth >= 2 || value === null || typeof value !== 'object') continue;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (typeof child === 'number' && !Number.isFinite(child)) {
        problems.push(`${path}${key}=${child}`);
      } else if (typeof child === 'object' && child !== null && depth < 1) {
        queue.push({ value: child, path: `${path}${key}.`, depth: depth + 1 });
      }
    }
  }
  return problems;
}

export interface CheckRunOptions {
  sampleFrames: number;
  pixelProbe?: (frame: number) => { mean: number; variance: number } | null;
}

export interface CheckRunOutcome {
  checks: MissionCheckResult[];
  evidence: FrameEvidence[];
}

const mkCheck = (
  id: string,
  label: string,
  passed: boolean,
  details: string,
  severity: CheckSeverity = 'error',
  skipped = false
): MissionCheckResult => ({ id, label, passed, details, severity, skipped });

/**
 * Drive the bundle through the tracking pipeline (camera + layers) at every
 * sampled frame, exactly like CanvasVideoEngine.renderAtFrame does — minus
 * the real canvas.
 */
function dryRunFrames(
  bundle: SceneBundle,
  frames: number[],
  pixelProbe?: (frame: number) => { mean: number; variance: number } | null
): FrameEvidence[] {
  const evidence: FrameEvidence[] = [];
  const { ctx, stats } = createTrackingContext(bundle.engine.width, bundle.engine.height);
  const fps = bundle.engine.fps;

  for (const frame of frames) {
    stats.drawCalls = 0;
    stats.nanCalls = 0;

    const rc: RenderContext = {
      ctx,
      frame,
      fps,
      timestampUs: frameToTimestampUs(frame, fps),
      width: bundle.engine.width,
      height: bundle.engine.height,
    };

    // Mirrors Engine.renderAtFrame: clear → camera → layers → restore
    ctx.save();
    bundle.camera.apply(rc);
    bundle.sceneGraph.renderFrame(rc);
    bundle.camera.restore(rc);

    const pixelLuma = pixelProbe ? pixelProbe(frame) : undefined;
    evidence.push({
      frame,
      timestampUs: rc.timestampUs,
      drawCalls: stats.drawCalls,
      nanCalls: stats.nanCalls,
      ...(pixelLuma ? { pixelLuma } : {}),
    });
  }
  return evidence;
}

/** Run every deterministic check. Returns checks + per-frame evidence. */
export function runAllChecks(
  bundle: SceneBundle,
  options: CheckRunOptions
): CheckRunOutcome {
  const checks: MissionCheckResult[] = [];
  const { engine, sceneGraph, totalFrames, camera } = bundle;
  const fps = engine.fps;
  const frames = sampleFrameIndices(totalFrames, options.sampleFrames);
  const evidence = dryRunFrames(bundle, frames, options.pixelProbe);

  // ── 1. frame-count ────────────────────────────────────────────────────
  checks.push(
    mkCheck(
      'frame-count',
      'Frame count consistency (bundle vs engine)',
      totalFrames === engine.durationInFrames && totalFrames > 0,
      `bundle.totalFrames=${totalFrames}, engine.durationInFrames=${engine.durationInFrames}, fps=${fps}`
    )
  );

  // ── 2. duration-sanity ────────────────────────────────────────────────
  const durationSec = totalFrames / fps;
  checks.push(
    mkCheck(
      'duration-sanity',
      'Duration sanity (1s – 600s)',
      durationSec >= 1 && durationSec <= 600,
      `duration=${durationSec.toFixed(2)}s @ ${fps} FPS`,
      'error'
    )
  );

  // ── 3. resolution-sanity ──────────────────────────────────────────────
  const resOk =
    engine.width > 0 && engine.height > 0 && engine.width <= 4096 && engine.height <= 4096;
  checks.push(
    mkCheck(
      'resolution-sanity',
      'Resolution sanity (≤ 4096×4096)',
      resOk,
      `${engine.width}x${engine.height}`
    )
  );

  // ── 4. timeline-monotonic ─────────────────────────────────────────────
  let monoOk = frames.length > 0;
  let lastUs = -Infinity;
  let monoDetail = `${frames.length} frames sampled`;
  for (const ev of evidence) {
    if (!Number.isFinite(ev.timestampUs) || ev.timestampUs <= lastUs) {
      monoOk = false;
      monoDetail = `non-monotonic/NaN timestamp at frame ${ev.frame} (${ev.timestampUs})`;
      break;
    }
    lastUs = ev.timestampUs;
  }
  if (frames.length > 0 && frameToTimestampUs(0, fps) !== 0) {
    monoOk = false;
    monoDetail = `frame 0 must map to 0 µs (got ${frameToTimestampUs(0, fps)})`;
  }
  checks.push(mkCheck('timeline-monotonic', 'Timeline determinism (µs strictly increasing)', monoOk, monoDetail));

  // ── 5. zindex-cap ─────────────────────────────────────────────────────
  const layers = sceneGraph.getAllLayers();
  const overlays: string[] = [];
  const badWindowZ: string[] = [];
  for (const l of layers) {
    if (!Number.isFinite(l.zIndex) || l.zIndex < 0) {
      badWindowZ.push(`${l.id}:z=${l.zIndex}`);
    } else if (l.zIndex >= MISSION_MAX_Z_CAP) {
      overlays.push(l.id);
    } else if (l.zIndex > WINDOW_Z_SANITY_MAX) {
      badWindowZ.push(`${l.id}:z=${l.zIndex}(>${WINDOW_Z_SANITY_MAX})`);
    }
  }
  const zOk = badWindowZ.length === 0 && overlays.length <= MAX_OVERLAY_LAYERS;
  checks.push(
    mkCheck(
      'zindex-cap',
      `Dynamic z-index discipline (cap ${MISSION_MAX_Z_CAP}, ≤ ${MAX_OVERLAY_LAYERS} overlays)`,
      zOk,
      `layers=${layers.length}, overlays=[${overlays.join(', ')}]` +
        (badWindowZ.length ? `, violations=[${badWindowZ.join(', ')}]` : '')
    )
  );

  // ── 6. render-clean (NaN guard + live layers) ─────────────────────────
  const nanFrames = evidence.filter((e) => e.nanCalls > 0);
  const deadFrames = evidence.filter((e) => e.drawCalls === 0);
  const renderOk = nanFrames.length === 0;
  checks.push(
    mkCheck(
      'render-clean',
      'Dry-run render: no NaN/Infinity in canvas calls',
      renderOk,
      nanFrames.length
        ? `NaN/Infinity at frames: ${nanFrames.map((e) => e.frame).join(', ')}`
        : `${evidence.length} frames rendered cleanly`
    )
  );

  // dead frames are a warning-level signal (blank/black screen suspicion)
  checks.push(
    mkCheck(
      'draw-density',
      'Every sampled frame draws something',
      deadFrames.length === 0,
      deadFrames.length
        ? `0 draw calls at frames: ${deadFrames.map((e) => e.frame).join(', ')} (possible blank frames)`
        : `min draw calls = ${Math.min(...evidence.map((e) => e.drawCalls))}`,
      'warning'
    )
  );

  // ── 7. layer-state-clean ──────────────────────────────────────────────
  const stateProblems: string[] = [];
  for (const l of layers) stateProblems.push(...scanLayerState(l));
  checks.push(
    mkCheck(
      'layer-state-clean',
      'Layer state finite after sampled renders',
      stateProblems.length === 0,
      stateProblems.length ? stateProblems.slice(0, 5).join('; ') : `${layers.length} layers clean`
    )
  );

  // ── 8. camera-state-clean ─────────────────────────────────────────────
  const cameraProblems = scanLayerState(camera);
  checks.push(
    mkCheck(
      'camera-state-clean',
      'Camera state finite after sampled renders',
      cameraProblems.length === 0,
      cameraProblems.length ? cameraProblems.join('; ') : 'camera transform state clean'
    )
  );

  // ── 9. pixel-luma (optional probe) ────────────────────────────────────
  const pixelFrames = evidence.filter((e) => e.pixelLuma !== undefined);
  if (pixelFrames.length === 0) {
    checks.push(
      mkCheck(
        'pixel-luma',
        'Pixel luma probe (non-black, non-flat)',
        true,
        'skipped: no pixel probe available (Node CLI)',
        'info',
        true
      )
    );
  } else {
    const blackFrames = pixelFrames.filter((e) => (e.pixelLuma as { mean: number }).mean < 2);
    const flatFrames = pixelFrames.filter(
      (e) => (e.pixelLuma as { mean: number; variance: number }).variance < 0.5
    );
    checks.push(
      mkCheck(
        'pixel-luma',
        'Pixel luma probe (non-black, non-flat)',
        blackFrames.length === 0 && flatFrames.length === 0,
        `${pixelFrames.length} frames probed` +
          (blackFrames.length ? `, black: [${blackFrames.map((e) => e.frame).join(', ')}]` : '') +
          (flatFrames.length ? `, flat: [${flatFrames.map((e) => e.frame).join(', ')}]` : '')
      )
    );
  }

  return { checks, evidence };
}
