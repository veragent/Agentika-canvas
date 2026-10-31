/**
 * agentika-canvas: Main Video & Animation Engine
 * Handles microsecond timing, resolution, Camera transforms, SceneGraph delegation,
 * and both realtime playback and offline deterministic frame-by-frame rendering.
 */

import { SceneGraph, RenderContext } from './SceneGraph';
import { Camera } from './Camera';
import { frameToTimestampUs } from './Timeline';

export interface EngineConfig {
  width?: number;
  height?: number;
  fps?: number;
  durationInFrames?: number;
  backgroundColor?: string;
  camera?: Camera;
}

export type PlaybackState = 'idle' | 'playing' | 'paused';
export type FrameCallback = (currentFrame: number, totalFrames: number) => void;

export class CanvasVideoEngine {
  public readonly width: number;
  public readonly height: number;
  public readonly fps: number;
  public readonly durationInFrames: number;
  public readonly sceneGraph: SceneGraph;
  public camera: Camera;
  public backgroundColor: string;

  private canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

  private currentFrame = 0;
  private state: PlaybackState = 'idle';
  private animationFrameId: number | null = null;
  private lastRenderTimestamp = 0;
  private listeners: Set<FrameCallback> = new Set();

  constructor(config: EngineConfig = {}, sceneGraph = new SceneGraph()) {
    this.width = config.width ?? 1920;
    this.height = config.height ?? 1080;
    this.fps = config.fps ?? 60;
    this.durationInFrames = config.durationInFrames ?? 60 * 10; // 10 seconds default
    this.backgroundColor = config.backgroundColor ?? '#090d16';
    this.camera = config.camera ?? new Camera({ enableShake: true });
    this.sceneGraph = sceneGraph;
  }

  /**
   * Bind an HTML or Offscreen Canvas element to the engine
   */
  public attachCanvas(canvas: HTMLCanvasElement | OffscreenCanvas): void {
    this.canvas = canvas;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('[CanvasVideoEngine] Failed to acquire 2D rendering context.');
    }
    this.ctx = context as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  }

  /**
   * Render a single frame deterministically at the specified frame index
   */
  public renderAtFrame(frame: number): RenderContext {
    if (!this.ctx) {
      throw new Error('[CanvasVideoEngine] No canvas attached. Call attachCanvas() first.');
    }

    const clampedFrame = Math.max(0, Math.min(frame, this.durationInFrames - 1));
    this.currentFrame = clampedFrame;
    const timestampUs = frameToTimestampUs(clampedFrame, this.fps);

    const rc: RenderContext = {
      ctx: this.ctx,
      frame: clampedFrame,
      fps: this.fps,
      timestampUs,
      width: this.width,
      height: this.height,
    };

    // 1. Clear full canvas surface
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 2. Apply Camera Transforms (Pan, Zoom, Organic Handheld Shake)
    this.camera.apply(rc);

    // 3. Render SceneGraph Layers (Sorted by dynamic zIndex)
    this.sceneGraph.renderFrame(rc);

    // 4. Restore Camera Transforms
    this.camera.restore(rc);

    // 5. Notify frame listeners
    this.notifyListeners();

    return rc;
  }

  /**
   * Advance one frame forward
   */
  public stepForward(): void {
    this.seekToFrame(this.currentFrame + 1);
  }

  /**
   * Advance one frame backward
   */
  public stepBackward(): void {
    this.seekToFrame(this.currentFrame - 1);
  }

  /**
   * Jump to a specific frame
   */
  public seekToFrame(frame: number): void {
    this.renderAtFrame(frame);
  }

  /**
   * Start interactive realtime playback (requestAnimationFrame)
   */
  public play(): void {
    if (this.state === 'playing') return;
    this.state = 'playing';
    this.lastRenderTimestamp = performance.now();
    this.loop();
  }

  /**
   * Pause playback
   */
  public pause(): void {
    this.state = 'paused';
    if (this.animationFrameId !== null && typeof window !== 'undefined') {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Toggle between play and pause
   */
  public togglePlay(): void {
    if (this.state === 'playing') {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Internal playback tick loop
   */
  private loop = (): void => {
    if (this.state !== 'playing') return;

    const now = performance.now();
    const frameIntervalMs = 1000 / this.fps;
    const elapsed = now - this.lastRenderTimestamp;

    if (elapsed >= frameIntervalMs) {
      const nextFrame = this.currentFrame + 1;
      if (nextFrame >= this.durationInFrames) {
        this.currentFrame = 0; // Loop seamlessly
      } else {
        this.currentFrame = nextFrame;
      }

      this.renderAtFrame(this.currentFrame);
      this.lastRenderTimestamp = now - (elapsed % frameIntervalMs);
    }

    if (typeof window !== 'undefined') {
      this.animationFrameId = requestAnimationFrame(this.loop);
    }
  };

  public getCurrentFrame(): number {
    return this.currentFrame;
  }

  public getState(): PlaybackState {
    return this.state;
  }

  public onFrame(callback: FrameCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    for (const cb of this.listeners) {
      cb(this.currentFrame, this.durationInFrames);
    }
  }
}
