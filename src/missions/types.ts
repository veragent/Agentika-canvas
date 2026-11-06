/**
 * agentika-canvas: Render Mission types
 *
 * The Mission pipeline (inspired by Nouride missions) turns rendering from
 * "fire and hope" into a verified pipeline:
 *
 *   brief → generate/scene → sampled dry-run render → deterministic CHECK
 *   → REVIEWER → report.md → (only when passed) export MP4
 *
 * Semantics adopted from Nouride:
 *  - A mission only passes when the deterministic checks AND the reviewer
 *    approve it — the scene never vouches for itself.
 *  - The SAME failure repeated maxAttempts times in a row HALTS the mission
 *    ("stopped and asked") instead of burning more attempts.
 */

import { SceneBundle } from '../core/SceneBundle';

export type MissionStatus = 'pending' | 'running' | 'passed' | 'failed' | 'halted';

export type CheckSeverity = 'error' | 'warning' | 'info';

export interface MissionCheckResult {
  /** Stable check identifier, e.g. 'frame-count'. */
  id: string;
  /** Human label for reports/UI. */
  label: string;
  passed: boolean;
  /** true when the check could not run (e.g. pixel probe unavailable). */
  skipped: boolean;
  severity: CheckSeverity;
  details: string;
}

export interface FrameEvidence {
  frame: number;
  timestampUs: number;
  drawCalls: number;
  nanCalls: number;
  /** Present only when a browser pixel probe is available. */
  pixelLuma?: { mean: number; variance: number };
}

export type ReviewVerdict = 'approve' | 'reject' | 'needs-human';

export interface MissionReviewResult {
  verdict: ReviewVerdict;
  notes: string[];
}

export interface MissionAttempt {
  index: number;
  status: 'passed' | 'failed';
  /** Stable signature of the failure (sorted failed check ids). */
  failureSignature: string;
  checks: MissionCheckResult[];
  evidence: FrameEvidence[];
  review: MissionReviewResult | null;
  durationMs: number;
}

export interface MissionReport {
  sceneId: string;
  status: MissionStatus;
  attempts: MissionAttempt[];
  totalAttempts: number;
  maxAttempts: number;
  startedAt: string;
  finishedAt: string;
  /** Set when status is 'halted' or 'failed'. */
  failureSignature?: string;
  /** Manual revision notes (e.g. FrameInspector notes) — reviewer input. */
  manualNotes: string[];
  summary: string;
}

export interface MissionHooks {
  /**
   * Optional browser-side pixel probe. Renders the given frame on the live
   * canvas and returns luma statistics. Return null to skip (Node CLI).
   */
  pixelProbe?: (frame: number) => { mean: number; variance: number } | null;
  /** Progress notification. */
  onStatus?: (status: MissionStatus, attempt: MissionAttempt | null) => void;
  /** Manual revision notes carried into the reviewer (FrameInspector output). */
  manualNotes?: string[];
}

export interface MissionConfig {
  sceneId: string;
  /** Max render attempts before failing. Default 3. */
  maxAttempts?: number;
  /** Number of evenly-spaced frames to dry-run. Default 12. */
  sampleFrames?: number;
  /** Restrict to a subset of check ids. Default: all. */
  checksWhitelist?: string[];
}

export type SceneFactory = () => SceneBundle;
