/**
 * agentika-canvas: Dedicated Web Worker for Video Encoding ($0 Server)
 * Offloads canvas rendering, WebCodecs VideoEncoder, and Mediabunny MP4 muxing
 * to a background worker so the Studio Editor UI remains completely fluid.
 */

import { Output, Mp4OutputFormat, BufferTarget, CanvasSource } from 'mediabunny';
import { SceneGraph } from '../core/SceneGraph';
import { CanvasVideoEngine } from '../core/Engine';
import { Camera } from '../core/Camera';
import { MacOSDesktopLayer } from '../kits/macos/MacOSDesktopLayer';
import { GitHubRepoLayer } from '../kits/github/GitHubRepoLayer';
import { WindowLayer } from '../kits/macos/WindowLayer';
import { WebcamWindowLayer } from '../kits/macos/WebcamWindowLayer';
import { CursorLayer } from '../kits/macos/CursorLayer';
import { ExternalVideoLayer } from '../kits/ExternalVideoLayer';

export interface ExportWorkerConfig {
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  codec?: string; // e.g. 'avc' (H.264) or 'vp9'
  bitrate?: number;
  enableCameraShake?: boolean;
}

export type ExportWorkerMessage =
  | { type: 'START'; config: ExportWorkerConfig }
  | { type: 'CANCEL' };

export type ExportWorkerResponse =
  | { type: 'PROGRESS'; frame: number; totalFrames: number; percent: number; fps: number }
  | { type: 'COMPLETE'; buffer: ArrayBuffer }
  | { type: 'ERROR'; error: string };

let isCancelled = false;

// Worker self scope listener
self.onmessage = async (event: MessageEvent<ExportWorkerMessage>) => {
  const msg = event.data;

  if (msg.type === 'CANCEL') {
    isCancelled = true;
    return;
  }

  if (msg.type === 'START') {
    isCancelled = false;
    const { width, height, fps, totalFrames, codec = 'avc', bitrate = 6_000_000, enableCameraShake = true } = msg.config;

    try {
      // 1. Create OffscreenCanvas
      const offscreenCanvas = new OffscreenCanvas(width, height);

      // 2. Setup SceneGraph & Standard Scene Kit
      const sceneGraph = new SceneGraph();
      const camera = new Camera({ enableShake: enableCameraShake, shakeIntensity: 1.8 });

      const desktop = new MacOSDesktopLayer({ wallpaperStyle: 'sequoia', activeAppName: 'GitHub Desktop' });
      const github = new GitHubRepoLayer({
        id: 'win-github',
        x: 80,
        y: 60,
        width: 1180,
        height: 720,
        zIndex: 10,
        owner: 'agentika-ai',
        repoName: 'agentika-canvas',
        starStartFrame: 30,
        starEndFrame: 160,
        startStars: 48200,
        targetStars: 354890,
      });

      const terminal = new WindowLayer({
        id: 'win-terminal',
        title: 'Antigravity CLI — agentika-canvas',
        x: 760,
        y: 380,
        width: 860,
        height: 480,
        zIndex: 20,
        accentColor: '#10b981',
        contentRenderer: (rc, x, y, w, h) => {
          const { ctx } = rc;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(x, y, w, h);
          ctx.fillStyle = '#10b981';
          ctx.font = '14px monospace';
          ctx.fillText('$ agy export-video --format=mp4 --codec=avc1', x + 16, y + 28);
          ctx.fillStyle = '#38bdf8';
          ctx.fillText('✓ WebCodecs VideoEncoder hardware acceleration active', x + 16, y + 56);
          ctx.fillText('✓ Mediabunny muxing stream to MP4 buffer ($0 server)', x + 16, y + 80);
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(`Frame ${rc.frame} / ${totalFrames} | ${rc.timestampUs} µs`, x + 16, y + 116);
        },
      });

      const webcam = new WebcamWindowLayer({
        id: 'win-webcam',
        x: 1420,
        y: 80,
        width: 380,
        height: 380,
        zIndex: 50,
        presenterName: 'Alex Developer',
        resizeStartFrame: 140,
        resizeEndFrame: 220,
        targetScale: 0.68,
        targetX: 1540,
        targetY: 620,
      });

      const externalVideo = new ExternalVideoLayer({
        id: 'win-ext-video',
        title: 'Demo Reel — ScreenCapture.mp4',
        x: 240,
        y: 360,
        width: 700,
        height: 390,
        zIndex: 15,
        timelineStartFrame: 0,
        timelineEndFrame: totalFrames,
      });

      const cursor = new CursorLayer([
        { frame: 0, point: { x: 300, y: 200 }, type: 'default' },
        { frame: 30, point: { x: 1140, y: 142 }, type: 'pointer' },
        { frame: 70, point: { x: 1140, y: 142 }, type: 'pointer' },
        { frame: 100, point: { x: 920, y: 440 }, type: 'default' },
        { frame: 135, point: { x: 1420, y: 80 }, type: 'resize' },
        { frame: 220, point: { x: 1540, y: 620 }, type: 'resize' },
        { frame: 240, point: { x: 1480, y: 600 }, type: 'default' },
        { frame: 360, point: { x: 800, y: 500 }, type: 'default' },
      ]);

      sceneGraph.addLayer(desktop);
      sceneGraph.addLayer(github);
      sceneGraph.addLayer(externalVideo);
      sceneGraph.addLayer(terminal);
      sceneGraph.addLayer(webcam);
      sceneGraph.addLayer(cursor);

      // 3. Setup Canvas Engine
      const engine = new CanvasVideoEngine(
        {
          width,
          height,
          fps,
          durationInFrames: totalFrames,
          camera,
          backgroundColor: '#020617',
        },
        sceneGraph
      );
      engine.attachCanvas(offscreenCanvas);

      // 4. Setup Mediabunny Output & Target
      const target = new BufferTarget();
      const output = new Output({
        format: new Mp4OutputFormat(),
        target,
      });

      const canvasSource = new CanvasSource(offscreenCanvas, {
        codec: codec === 'vp9' ? 'vp9' : 'avc',
        bitrate,
      });

      output.addVideoTrack(canvasSource);
      await output.start();

      const startTime = performance.now();

      // 5. Deterministic Frame-by-Frame Encoding Loop
      for (let f = 0; f < totalFrames; f++) {
        if (isCancelled) {
          await output.cancel();
          return;
        }

        // Render scene graph to offscreen canvas
        engine.renderAtFrame(f);

        // Add frame to Mediabunny CanvasSource (timestamp & duration in seconds)
        const timeSec = f / fps;
        const durationSec = 1 / fps;
        const isKeyFrame = f % 60 === 0;

        await canvasSource.add(timeSec, durationSec, {
          keyFrame: isKeyFrame,
        });

        // Compute performance metrics
        const elapsedSec = (performance.now() - startTime) / 1000;
        const speedFps = Math.round((f + 1) / Math.max(0.001, elapsedSec));
        const percent = Math.round(((f + 1) / totalFrames) * 100);

        // Send progress report to main thread every 4 frames or at the end
        if (f % 4 === 0 || f === totalFrames - 1) {
          self.postMessage({
            type: 'PROGRESS',
            frame: f + 1,
            totalFrames,
            percent,
            fps: speedFps,
          } as ExportWorkerResponse);
        }
      }

      // 6. Finalize container
      await output.finalize();

      const outputBuffer = target.buffer;
      if (!outputBuffer) {
        throw new Error('Mediabunny export completed but BufferTarget is null.');
      }

      // Send buffer back to main thread
      (self as any).postMessage(
        {
          type: 'COMPLETE',
          buffer: outputBuffer,
        } as ExportWorkerResponse,
        [outputBuffer]
      );
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      self.postMessage({
        type: 'ERROR',
        error: errorMsg,
      } as ExportWorkerResponse);
    }
  }
};
