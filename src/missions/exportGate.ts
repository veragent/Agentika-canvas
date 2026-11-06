/**
 * agentika-canvas: Export Gate & pre-export risk assessment
 *
 * "Video yang gagal quality gate tidak pernah diekspor."
 * The Studio calls assertMissionPassed() before triggering the WebCodecs
 * export; estimateExport() performs the HMADS-style risk scoring (resolution,
 * duration, estimated file size) shown in the export modal.
 */

import { MissionReport } from './types';

export class MissionGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissionGateError';
  }
}

/** Hard gate: throws (with a friendly message) when the mission has not passed. */
export function assertMissionPassed(report: MissionReport | null | undefined): void {
  if (!report) {
    throw new MissionGateError(
      'Belum ada Mission Report. Jalankan "Mission Check" dulu — export hanya diizinkan untuk scene yang lulus verifikasi.'
    );
  }
  if (report.status === 'passed') return;

  const failedChecks =
    report.attempts[report.attempts.length - 1]?.checks
      .filter((c) => !c.passed && !c.skipped)
      .map((c) => `❌ ${c.label}: ${c.details}`) ?? [];

  throw new MissionGateError(
    `Mission untuk scene "${report.sceneId}" berstatus ${report.status.toUpperCase()} — export diblokir.\n` +
      failedChecks.slice(0, 5).join('\n')
  );
}

export interface ExportEstimateInput {
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  /** bits per second */
  bitrate: number;
}

export interface ExportEstimate {
  durationSeconds: number;
  estimatedBytes: number;
  warnings: string[];
}

/**
 * Pre-export risk assessment (HMADS-render style). Warnings are advisory,
 * shown in the export modal before the user commits to a heavy encode.
 */
export function estimateExport(input: ExportEstimateInput): ExportEstimate {
  const warnings: string[] = [];
  const durationSeconds = input.totalFrames / input.fps;
  const estimatedBytes = (input.bitrate / 8) * durationSeconds;

  if (input.width > 3840 || input.height > 2160) {
    warnings.push(`Resolusi ${input.width}×${input.height} melebihi 4K — encode bisa sangat berat di GPU entry-level.`);
  }
  if (durationSeconds > 600) {
    warnings.push(`Durasi ${(durationSeconds / 60).toFixed(1)} menit > 10 menit — pertimbangkan memecah video.`);
  }
  if (estimatedBytes > 500 * 1024 * 1024) {
    warnings.push(
      `Estimasi ukuran file ~${(estimatedBytes / 1024 / 1024).toFixed(0)} MB (> 500 MB) — encode lama & memori besar.`
    );
  }
  if (input.fps > 60) {
    warnings.push(`FPS ${input.fps} > 60 — sebagian codec/browser menolak atau turun performa.`);
  }

  return { durationSeconds, estimatedBytes, warnings };
}
