/**
 * agentika-canvas: Controlled Handheld Camera & Viewport Controller
 * Implements organic low-frequency camera shake and smooth pan/zoom
 * without causing small text jitter ("anti-AI slop").
 */

import { RenderContext } from './SceneGraph';
import { interpolate, Easing } from './Timeline';

export interface CameraConfig {
  enableShake?: boolean;
  shakeIntensity?: number; // Base translation shake in pixels (default 2px)
  shakeFrequency?: number; // Frequency in Hz (default 1.2 Hz)
  rotationalShake?: number; // Subtle micro-rotation in radians (default 0.0015 rad ~0.08 deg)
  zoom?: number;
  x?: number;
  y?: number;
}

export class Camera {
  public enableShake: boolean;
  public shakeIntensity: number;
  public shakeFrequency: number;
  public rotationalShake: number;

  public x = 0;
  public y = 0;
  public zoom = 1.0;
  public rotation = 0;

  constructor(config: CameraConfig = {}) {
    this.enableShake = config.enableShake ?? true;
    this.shakeIntensity = config.shakeIntensity ?? 2.0;
    this.shakeFrequency = config.shakeFrequency ?? 1.2;
    this.rotationalShake = config.rotationalShake ?? 0.0015;
    this.zoom = config.zoom ?? 1.0;
    this.x = config.x ?? 0;
    this.y = config.y ?? 0;
  }

  /**
   * Deterministic harmonic noise generator (multi-sine synthesis)
   * Avoids random Math.random() so rendering is 100% deterministic per frame.
   */
  private getNoise(timeSec: number, seed: number): number {
    const f1 = this.shakeFrequency;
    const f2 = f1 * 1.618; // Golden ratio harmonic
    const f3 = f1 * 0.414; // Sub-harmonic

    return (
      Math.sin(timeSec * f1 * 2 * Math.PI + seed) * 0.55 +
      Math.sin(timeSec * f2 * 2 * Math.PI + seed * 1.5) * 0.3 +
      Math.sin(timeSec * f3 * 2 * Math.PI + seed * 2.7) * 0.15
    );
  }

  /**
   * Calculate camera offset and micro-rotation at current frame
   */
  public getTransformAtFrame(frame: number, fps: number) {
    const timeSec = frame / fps;

    let offsetX = this.x;
    let offsetY = this.y;
    let rot = this.rotation;

    if (this.enableShake) {
      // Seeded offsets for X, Y, and Angle
      const shakeX = this.getNoise(timeSec, 1.34) * this.shakeIntensity;
      const shakeY = this.getNoise(timeSec, 7.89) * (this.shakeIntensity * 0.85);
      const microRot = this.getNoise(timeSec, 13.45) * this.rotationalShake;

      offsetX += shakeX;
      offsetY += shakeY;
      rot += microRot;
    }

    return {
      x: offsetX,
      y: offsetY,
      zoom: this.zoom,
      rotation: rot,
    };
  }

  /**
   * Apply camera transform to canvas 2D context
   */
  public apply(rc: RenderContext): void {
    const { ctx, frame, fps, width, height } = rc;
    const t = this.getTransformAtFrame(frame, fps);

    ctx.save();

    // Pivot around screen center
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.translate(centerX + t.x, centerY + t.y);
    if (t.rotation !== 0) {
      ctx.rotate(t.rotation);
    }
    if (t.zoom !== 1.0) {
      ctx.scale(t.zoom, t.zoom);
    }
    ctx.translate(-centerX, -centerY);
  }

  /**
   * Restore canvas transform state
   */
  public restore(rc: RenderContext): void {
    rc.ctx.restore();
  }

  /**
   * Smooth animated pan/zoom between frames
   */
  public animateZoom(
    currentFrame: number,
    startFrame: number,
    endFrame: number,
    startZoom: number,
    endZoom: number
  ): void {
    this.zoom = interpolate(
      currentFrame,
      [startFrame, endFrame],
      [startZoom, endZoom],
      Easing.easeInOutCubic
    );
  }
}
