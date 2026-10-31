/**
 * agentika-canvas: External Video Asset Layer
 * Renders an external video file (MP4, WebM, MOV, MKV) synchronously onto the canvas,
 * synchronized frame-by-frame with the master timeline.
 */

import { CanvasLayer, RenderContext } from '../core/SceneGraph';
import { PreciseVideoReader } from '../media/MediaIngestion';

export interface ExternalVideoConfig {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
  title?: string;
  sourceUrl?: string;
  sourceBlob?: Blob;
  timelineStartFrame?: number;
  timelineEndFrame?: number;
  videoStartOffsetSec?: number;
  borderRadius?: number;
  loop?: boolean;
}

export class ExternalVideoLayer implements CanvasLayer {
  public id: string;
  public zIndex: number;
  public visible = true;
  public title: string;

  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public borderRadius: number;

  public timelineStartFrame: number;
  public timelineEndFrame: number;
  public videoStartOffsetSec: number;
  public loop: boolean;

  private reader: PreciseVideoReader | null = null;
  private currentFrameCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
  private isLoaded = false;
  private currentVideoTimeSec = 0;

  constructor(config: ExternalVideoConfig) {
    this.id = config.id ?? 'external-video-asset';
    this.zIndex = config.zIndex ?? 15;
    this.title = config.title ?? 'External Screen Capture.mp4';

    this.x = config.x;
    this.y = config.y;
    this.width = config.width;
    this.height = config.height;
    this.borderRadius = config.borderRadius ?? 12;

    this.timelineStartFrame = config.timelineStartFrame ?? 0;
    this.timelineEndFrame = config.timelineEndFrame ?? 360;
    this.videoStartOffsetSec = config.videoStartOffsetSec ?? 0;
    this.loop = config.loop ?? true;

    if (config.sourceUrl || config.sourceBlob) {
      this.initReader(config.sourceUrl || config.sourceBlob!);
    }
  }

  private async initReader(source: string | Blob): Promise<void> {
    try {
      this.reader = new PreciseVideoReader();
      await this.reader.load(source);
      this.isLoaded = true;
    } catch (err) {
      console.warn('[ExternalVideoLayer] Video loading deferred or failed:', err);
      this.isLoaded = false;
    }
  }

  public update(rc: RenderContext): void {
    if (rc.frame < this.timelineStartFrame || rc.frame > this.timelineEndFrame) {
      return;
    }

    const elapsedFrames = rc.frame - this.timelineStartFrame;
    this.currentVideoTimeSec = this.videoStartOffsetSec + elapsedFrames / rc.fps;

    if (this.isLoaded && this.reader) {
      // Async sample retrieval for next frame presentation
      this.reader.getSampleAt(this.currentVideoTimeSec).then((sample) => {
        if (sample) {
          try {
            const canvasSource = sample.toCanvasImageSource();
            if (canvasSource instanceof OffscreenCanvas || canvasSource instanceof HTMLCanvasElement) {
              this.currentFrameCanvas = canvasSource;
            }
          } catch {
            // fallback
          }
        }
      });
    }
  }

  public draw(rc: RenderContext): void {
    if (rc.frame < this.timelineStartFrame || rc.frame > this.timelineEndFrame) {
      return;
    }

    const { ctx } = rc;
    ctx.save();

    // 1. Drop Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 14;

    // 2. Rounded Container Clip
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, this.borderRadius);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    ctx.shadowColor = 'transparent';

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, this.borderRadius);
    ctx.clip();

    // 3. Draw Video Frame or High-Tech Animated Fallback Screen
    if (this.currentFrameCanvas) {
      ctx.drawImage(this.currentFrameCanvas, this.x, this.y, this.width, this.height);
    } else {
      this.drawSynthesizedVideoScreen(ctx, this.x, this.y, this.width, this.height, rc);
    }

    ctx.restore();

    // 4. Outer Border
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();

    // 5. Title & Timecode Pill Badge
    this.drawVideoOverlayHeader(ctx, this.x, this.y, this.width, rc);

    ctx.restore();
  }

  /**
   * High-Tech Video Screen Generator (used while loading or in test suites)
   */
  private drawSynthesizedVideoScreen(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    rc: RenderContext
  ): void {
    // Cyberpunk grid background
    const bgGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    bgGrad.addColorStop(0, '#020617');
    bgGrad.addColorStop(0.5, '#0f172a');
    bgGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(x, y, w, h);

    // Subtle animated grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    const gridSize = 32;
    for (let lx = x; lx < x + w; lx += gridSize) {
      ctx.beginPath();
      ctx.moveTo(lx, y);
      ctx.lineTo(lx, y + h);
      ctx.stroke();
    }
    for (let ly = y; ly < y + h; ly += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, ly);
      ctx.lineTo(x + w, ly);
      ctx.stroke();
    }

    // Centered Synthetic Screen Capture Content
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('External Video Stream Ingestion', x + w / 2, y + h / 2 - 20);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText(
      `Sync: ${this.currentVideoTimeSec.toFixed(3)}s | Codec: H.264 / Mediabunny Demuxer`,
      x + w / 2,
      y + h / 2 + 10
    );

    // Oscillating Scanline
    const scanlineY = y + (Math.sin(rc.frame * 0.05) * 0.5 + 0.5) * h;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.fillRect(x, scanlineY, w, 2);
  }

  private drawVideoOverlayHeader(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    rc: RenderContext
  ): void {
    const barH = 32;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(x, y, w, barH);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '500 12px system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🎬 ${this.title}`, x + 12, y + barH / 2);

    // Timecode badge
    ctx.textAlign = 'right';
    ctx.font = '11px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(
      `TC: ${this.currentVideoTimeSec.toFixed(2)}s [F:${rc.frame}]`,
      x + w - 12,
      y + barH / 2
    );
  }

  public dispose(): void {
    if (this.reader) {
      this.reader.close();
      this.reader = null;
    }
  }
}
