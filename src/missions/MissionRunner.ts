/**
 * agentika-canvas: Mission Runner
 *
 * Executes the verified render pipeline:
 *
 *   attempt ≤ maxAttempts:
 *     1. instantiate a FRESH bundle (stale state must not mask failures)
 *     2. deterministic checks (see checks.ts) at sampled frames
 *     3. reviewer verdict (deterministic by default, pluggable for LLM/vision)
 *
 * Nouride semantics:
 *  - failure with the SAME signature maxAttempts times in a row → HALTED
 *    (the mission "stops and asks", it does not burn attempts in a loop)
 *  - a scene only passes when checks AND reviewer approve it
 */

import { runAllChecks } from './checks';
import {
  MissionConfig,
  MissionHooks,
  MissionReport,
  MissionAttempt,
  MissionReviewResult,
  FrameEvidence,
  MissionCheckResult,
  ReviewVerdict,
  SceneFactory,
} from './types';

export interface MissionReviewer {
  review(
    evidence: FrameEvidence[],
    checks: MissionCheckResult[],
    manualNotes: string[]
  ): MissionReviewResult;
}

/**
 * Default deterministic reviewer. Produces advisory notes and:
 *  - rejects when > 30% of sampled frames drew nothing (blank screen risk)
 *  - returns 'needs-human' when unresolved manual revision notes exist
 */
export class DeterministicReviewer implements MissionReviewer {
  public review(
    evidence: FrameEvidence[],
    checks: MissionCheckResult[],
    manualNotes: string[]
  ): MissionReviewResult {
    const notes: string[] = [];
    let verdict: ReviewVerdict = 'approve';

    if (evidence.length === 0) {
      return { verdict: 'reject', notes: ['Tidak ada frame yang bisa disample — scene kosong?'] };
    }

    const drawCounts = evidence.map((e) => e.drawCalls);
    const minDraw = Math.min(...drawCounts);
    const avgDraw = drawCounts.reduce((a, b) => a + b, 0) / drawCounts.length;
    notes.push(`Draw density: min ${minDraw}, avg ${avgDraw.toFixed(1)} calls/frame di ${evidence.length} frame sampel.`);

    const deadRatio = evidence.filter((e) => e.drawCalls === 0).length / evidence.length;
    if (deadRatio > 0.3) {
      verdict = 'reject';
      notes.push(`${Math.round(deadRatio * 100)}% frame sampel tidak menggambar apa pun — kemungkinan layar kosong/hitam.`);
    }

    const warnings = checks.filter((c) => !c.passed && c.severity === 'warning');
    for (const w of warnings) notes.push(`Peringatan: ${w.label} — ${w.details}`);

    const pixelFrames = evidence.filter((e) => e.pixelLuma !== undefined);
    if (pixelFrames.length) {
      const means = pixelFrames.map((e) => (e.pixelLuma as { mean: number }).mean);
      const lumaMin = Math.min(...means);
      const lumaMax = Math.max(...means);
      notes.push(`Luma range: ${lumaMin.toFixed(1)}–${lumaMax.toFixed(1)} di ${pixelFrames.length} frame berprobe.`);
    } else {
      notes.push('Pixel probe tidak tersedia — pemeriksaan visual pixel dilewati (jalankan dari Studio untuk probe penuh).');
    }

    if (manualNotes.length) {
      verdict = verdict === 'reject' ? 'reject' : 'needs-human';
      notes.push(`${manualNotes.length} catatan revisi manual menunggu (FrameInspector) — butuh keputusan manusia.`);
    }

    return { verdict, notes };
  }
}

const failureSignatureOf = (checks: MissionCheckResult[]): string =>
  checks
    .filter((c) => !c.passed && !c.skipped && c.severity === 'error')
    .map((c) => c.id)
    .sort()
    .join('+') || 'unknown';

/**
 * Run a mission for a scene. The sceneFactory MUST return a fresh bundle on
 * every call — retries are only meaningful against fresh state.
 *
 * Halt semantics (Nouride): the SAME failure repeated HALT_STREAK times in a
 * row stops the mission early ("stopped and asked") instead of burning the
 * remaining attempts.
 */
export const MISSION_HALT_STREAK = 3;

export async function runMission(
  sceneFactory: SceneFactory,
  config: MissionConfig,
  hooks: MissionHooks = {},
  reviewer: MissionReviewer = new DeterministicReviewer()
): Promise<MissionReport> {
  const maxAttempts = config.maxAttempts ?? 3;
  const sampleFrames = config.sampleFrames ?? 12;
  const startedAt = new Date().toISOString();

  const attempts: MissionAttempt[] = [];
  let status: MissionReport['status'] = 'failed';
  let failureSignature: string | undefined;
  let consecutiveSameFailure = 0;
  let lastSignature = '';
  let haltedEarly = false;

  for (let attemptIndex = 1; attemptIndex <= maxAttempts; attemptIndex++) {
    hooks.onStatus?.('running', null);

    const startedMs = Date.now();
    const bundle = sceneFactory();
    const { checks, evidence } = runAllChecks(bundle, {
      sampleFrames,
      pixelProbe: hooks.pixelProbe,
    });

    const errorChecks = checks.filter((c) => !c.passed && !c.skipped && c.severity === 'error');
    const attempt: MissionAttempt = {
      index: attemptIndex,
      status: 'failed',
      failureSignature: '',
      checks,
      evidence,
      review: null,
      durationMs: Date.now() - startedMs,
    };

    if (errorChecks.length > 0) {
      attempt.failureSignature = failureSignatureOf(checks);
      attempts.push(attempt);
      if (attempt.failureSignature === lastSignature) {
        consecutiveSameFailure++;
      } else {
        consecutiveSameFailure = 1;
        lastSignature = attempt.failureSignature;
      }
      // Nouride pattern: identical failure repeated HALT_STREAK times → stop
      if (consecutiveSameFailure >= MISSION_HALT_STREAK) {
        haltedEarly = true;
        break;
      }
      continue;
    }

    // All deterministic checks passed → reviewer gate
    const review = reviewer.review(evidence, checks, hooks.manualNotes ?? []);
    attempt.review = review;
    if (review.verdict === 'approve') {
      attempt.status = 'passed';
      attempt.failureSignature = '';
      attempts.push(attempt);
      status = 'passed';
      break;
    }

    attempt.failureSignature = `reviewer:${review.verdict}`;
    attempts.push(attempt);
    if (attempt.failureSignature === lastSignature) {
      consecutiveSameFailure++;
    } else {
      consecutiveSameFailure = 1;
      lastSignature = attempt.failureSignature;
    }
    if (consecutiveSameFailure >= MISSION_HALT_STREAK) {
      haltedEarly = true;
      break;
    }
  }

  if (status !== 'passed') {
    failureSignature = lastSignature || 'unknown';
    status = haltedEarly ? 'halted' : 'failed';
  }

  const finishedAt = new Date().toISOString();
  const summary =
    status === 'passed'
      ? `Mission lulus: ${attempts.length} attempt, seluruh check deterministik lolos dan reviewer menyetujui.`
      : status === 'halted'
        ? `Mission dihentikan: kegagalan dengan signature sama (\`${failureSignature}\`) berulang ${consecutiveSameFailure}× berturut-turut.`
        : `Mission gagal setelah ${attempts.length} attempt. Signature terakhir: \`${failureSignature}\`.`;

  const report: MissionReport = {
    sceneId: config.sceneId,
    status,
    attempts,
    totalAttempts: attempts.length,
    maxAttempts,
    startedAt,
    finishedAt,
    ...(failureSignature ? { failureSignature } : {}),
    manualNotes: hooks.manualNotes ?? [],
    summary,
  };

  hooks.onStatus?.(status, attempts[attempts.length - 1] ?? null);
  return report;
}
