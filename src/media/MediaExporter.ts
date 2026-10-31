/**
 * agentika-canvas: Media Exporter Orchestrator (Client-Side $0 Server)
 * Orchestrates WebCodecs and Mediabunny encoding via Web Worker with main-thread fallback,
 * and triggers automatic MP4 file download in browser.
 */

import { Output, Mp4OutputFormat, BufferTarget, CanvasSource } from 'mediabunny';
import { CanvasVideoEngine } from '../core/Engine';
import { ExportWorkerConfig, ExportWorkerResponse } from './Exporter.worker';

export interface ExportProgressEvent {
  frame: number;
  totalFrames: number;
  percent: number;
  fps: number;
}

export type ExportProgressCallback = (progress: ExportProgressEvent) => void;

export interface ExportOptions extends ExportWorkerConfig {
  filename?: string;
  useWorker?: boolean;
}

/**
 * Trigger browser file download from Blob
 */
export function downloadBlob(blob: Blob, filename = 'agentika-video.mp4'): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Export canvas video to MP4 directly inside the browser.
 * Prefers Web Worker with OffscreenCanvas for non-blocking UI, with main-thread fallback.
 */
export async function exportVideo(
  options: ExportOptions,
  onProgress?: ExportProgressCallback,
  engineFallback?: CanvasVideoEngine,
  canvasFallback?: HTMLCanvasElement
): Promise<Blob> {
  const {
    width = 1920,
    height = 1080,
    fps = 60,
    totalFrames = 360,
    codec = 'avc',
    bitrate = 6_000_000,
    enableCameraShake = true,
    filename = 'agentika-canvas.mp4',
    useWorker = true,
  } = options;

  const supportsOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';

  if (useWorker && supportsOffscreenCanvas && typeof Worker !== 'undefined') {
    try {
      return await exportViaWorker(
        { width, height, fps, totalFrames, codec, bitrate, enableCameraShake },
        filename,
        onProgress
      );
    } catch (workerErr) {
      console.warn('[MediaExporter] Web Worker export failed, falling back to main-thread export:', workerErr);
    }
  }

  // Fallback to main thread export
  if (!engineFallback || !canvasFallback) {
    throw new Error('[MediaExporter] Worker not supported and no fallback engine/canvas provided.');
  }

  return await exportInMainThread(
    canvasFallback,
    engineFallback,
    { width, height, fps, totalFrames, codec, bitrate, enableCameraShake },
    onProgress
  );
}

/**
 * Export via Dedicated Web Worker
 */
function exportViaWorker(
  config: ExportWorkerConfig,
  _filename: string,
  onProgress?: ExportProgressCallback
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(new URL('./Exporter.worker.ts', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = (event: MessageEvent<ExportWorkerResponse>) => {
        const data = event.data;

        if (data.type === 'PROGRESS') {
          onProgress?.(data);
        } else if (data.type === 'COMPLETE') {
          worker.terminate();
          const blob = new Blob([data.buffer], { type: 'video/mp4' });
          resolve(blob);
        } else if (data.type === 'ERROR') {
          worker.terminate();
          reject(new Error(data.error));
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        reject(err);
      };

      worker.postMessage({ type: 'START', config });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Direct main-thread export using Mediabunny & CanvasSource
 */
export async function exportInMainThread(
  canvas: HTMLCanvasElement,
  engine: CanvasVideoEngine,
  config: ExportWorkerConfig,
  onProgress?: ExportProgressCallback
): Promise<Blob> {
  const { fps, totalFrames, bitrate = 6_000_000, codec = 'avc' } = config;

  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat(),
    target,
  });

  const canvasSource = new CanvasSource(canvas, {
    codec: codec === 'vp9' ? 'vp9' : 'avc',
    bitrate,
  });

  output.addVideoTrack(canvasSource);
  await output.start();

  const startTime = performance.now();

  for (let f = 0; f < totalFrames; f++) {
    // Render deterministic frame
    engine.renderAtFrame(f);

    const timeSec = f / fps;
    const durationSec = 1 / fps;
    const isKeyFrame = f % 60 === 0;

    await canvasSource.add(timeSec, durationSec, {
      keyFrame: isKeyFrame,
    });

    const elapsedSec = (performance.now() - startTime) / 1000;
    const speedFps = Math.round((f + 1) / Math.max(0.001, elapsedSec));
    const percent = Math.round(((f + 1) / totalFrames) * 100);

    if (f % 4 === 0 || f === totalFrames - 1) {
      onProgress?.({
        frame: f + 1,
        totalFrames,
        percent,
        fps: speedFps,
      });
    }
  }

  await output.finalize();

  if (!target.buffer) {
    throw new Error('Mediabunny export failed: target buffer is null');
  }

  return new Blob([target.buffer], { type: 'video/mp4' });
}
