/**
 * agentika-canvas: High-Fidelity Presenter Webcam Layer (Anti-AI Slop)
 * Renders a crisp floating presenter overlay with realistic portrait,
 * audio talking waveforms, recording indicator, and smooth deterministic resizing.
 */

import { CanvasLayer, RenderContext } from '../../core/SceneGraph';
import { interpolate, Easing } from '../../core/Timeline';

export interface WebcamConfig {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
  presenterName?: string;
  resizeStartFrame?: number;
  resizeEndFrame?: number;
  targetScale?: number; // e.g. 0.65 to shrink
  targetX?: number;
  targetY?: number;
}

export class WebcamWindowLayer implements CanvasLayer {
  public id: string;
  public zIndex: number;
  public visible = true;

  public initialX: number;
  public initialY: number;
  public initialWidth: number;
  public initialHeight: number;

  public currentX: number;
  public currentY: number;
  public currentWidth: number;
  public currentHeight: number;

  public presenterName: string;
  public resizeStartFrame: number;
  public resizeEndFrame: number;
  public targetScale: number;
  public targetX: number;
  public targetY: number;

  constructor(config: WebcamConfig) {
    this.id = config.id ?? 'webcam-window';
    this.zIndex = config.zIndex ?? 50;

    this.initialX = config.x;
    this.initialY = config.y;
    this.initialWidth = config.width;
    this.initialHeight = config.height;

    this.currentX = config.x;
    this.currentY = config.y;
    this.currentWidth = config.width;
    this.currentHeight = config.height;

    this.presenterName = config.presenterName ?? 'Alex Developer';
    this.resizeStartFrame = config.resizeStartFrame ?? 90;
    this.resizeEndFrame = config.resizeEndFrame ?? 150;
    this.targetScale = config.targetScale ?? 0.7;
    this.targetX = config.targetX ?? config.x + 80;
    this.targetY = config.targetY ?? config.y + 120;
  }

  public update(rc: RenderContext): void {
    // Smooth deterministic window resizing transition
    const scale = interpolate(
      rc.frame,
      [this.resizeStartFrame, this.resizeEndFrame],
      [1.0, this.targetScale],
      Easing.easeInOutCubic
    );

    this.currentWidth = this.initialWidth * scale;
    this.currentHeight = this.initialHeight * scale;

    this.currentX = interpolate(
      rc.frame,
      [this.resizeStartFrame, this.resizeEndFrame],
      [this.initialX, this.targetX],
      Easing.easeInOutCubic
    );

    this.currentY = interpolate(
      rc.frame,
      [this.resizeStartFrame, this.resizeEndFrame],
      [this.initialY, this.targetY],
      Easing.easeInOutCubic
    );
  }

  public draw(rc: RenderContext): void {
    const { ctx } = rc;
    const x = this.currentX;
    const y = this.currentY;
    const w = this.currentWidth;
    const h = this.currentHeight;

    ctx.save();

    // 1. Deep Drop Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 16;

    // 2. Rounded Window Clip
    const radius = 18;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fillStyle = '#1e293b';
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // 3. Render Presenter Portrait & Studio Background
    this.drawPresenterPortrait(ctx, x, y, w, h, rc, radius);

    // 4. Subtle Outer Neon Glow Border
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)'; // Cyan border
    ctx.stroke();

    // 5. Presenter Badge Overlay (Name + Live Audio Visualizer)
    this.drawPresenterBadge(ctx, x, y, w, h, rc);

    // 6. Top Right "REC" Indicator
    this.drawRecIndicator(ctx, x + w - 50, y + 16, rc.frame);

    ctx.restore();
  }

  private drawPresenterPortrait(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    _rc: RenderContext,
    radius: number
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.clip();

    // Studio Background with ambient lighting
    const bgGrad = ctx.createRadialGradient(x + w * 0.5, y + h * 0.4, 10, x + w * 0.5, y + h * 0.5, w * 0.7);
    bgGrad.addColorStop(0, '#312e81'); // Indigo studio light
    bgGrad.addColorStop(0.7, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(x, y, w, h);

    // Presenter Silhouette / Stylized Avatar (Professional Developer)
    const centerX = x + w / 2;
    const centerY = y + h * 0.45;
    const headRadius = w * 0.18;

    // Shoulders / Torso
    ctx.beginPath();
    ctx.ellipse(centerX, y + h * 0.95, w * 0.42, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b'; // Dark jacket
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#38bdf8'; // Rim lighting on shoulders
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(centerX, centerY, headRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#fbd5bd'; // Skin tone
    ctx.fill();

    // Hair
    ctx.beginPath();
    ctx.arc(centerX, centerY - headRadius * 0.15, headRadius * 1.05, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fillStyle = '#262626';
    ctx.fill();

    // Headset / Microphone
    ctx.beginPath();
    ctx.arc(centerX, centerY - 2, headRadius * 1.12, Math.PI * 1.1, Math.PI * 1.9);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#64748b';
    ctx.stroke();

    // Mic Boom
    ctx.beginPath();
    ctx.moveTo(centerX - headRadius * 1.05, centerY);
    ctx.lineTo(centerX - headRadius * 0.3, centerY + headRadius * 0.5);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Mic Capsule
    ctx.beginPath();
    ctx.arc(centerX - headRadius * 0.3, centerY + headRadius * 0.5, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();

    // Subtitle speech indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = `600 ${Math.max(10, Math.round(w * 0.042))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('Live Presenter Stream', centerX, y + h * 0.78);

    ctx.restore();
  }

  private drawPresenterBadge(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    rc: RenderContext
  ): void {
    const badgeH = Math.max(24, Math.round(h * 0.12));
    const badgeW = w - 24;
    const badgeX = x + 12;
    const badgeY = y + h - badgeH - 12;

    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.stroke();

    // Presenter Name
    ctx.fillStyle = '#f8fafc';
    ctx.font = `bold ${Math.max(10, Math.round(badgeH * 0.44))}px system-ui`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.presenterName, badgeX + 10, badgeY + badgeH / 2);

    // Audio Wave Visualizer Bars (Deterministic sine wave oscillation)
    const barCount = 4;
    const waveStartX = badgeX + badgeW - 40;
    const waveCenterY = badgeY + badgeH / 2;

    for (let i = 0; i < barCount; i++) {
      const freq = 0.08;
      const barH = 4 + Math.abs(Math.sin((rc.frame + i * 15) * freq)) * (badgeH * 0.5);

      ctx.fillStyle = '#22c55e'; // Green talking audio
      ctx.fillRect(waveStartX + i * 7, waveCenterY - barH / 2, 3, barH);
    }
  }

  private drawRecIndicator(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    x: number,
    y: number,
    frame: number
  ): void {
    // Blinking red dot every 30 frames (0.5s at 60fps)
    const isLit = Math.floor(frame / 30) % 2 === 0;

    ctx.beginPath();
    ctx.roundRect(x, y, 42, 18, 4);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x + 9, y + 9, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = isLit ? '#ef4444' : '#7f1d1d';
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 9px system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('REC', x + 18, y + 10);
  }
}
