/**
 * agentika-canvas: MacOS Window Component Layer
 * Demonstrates dynamic z-index layering and smooth deterministic animation.
 */

import { CanvasLayer, RenderContext } from '../../core/SceneGraph';

export interface WindowLayerOptions {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  accentColor?: string;
  contentRenderer?: (rc: RenderContext, innerX: number, innerY: number, innerW: number, innerH: number) => void;
}

export class WindowLayer implements CanvasLayer {
  public id: string;
  public title: string;
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public zIndex: number;
  public visible = true;
  public opacity = 1.0;
  public accentColor: string;
  private contentRenderer?: WindowLayerOptions['contentRenderer'];

  constructor(options: WindowLayerOptions) {
    this.id = options.id;
    this.title = options.title;
    this.x = options.x;
    this.y = options.y;
    this.width = options.width;
    this.height = options.height;
    this.zIndex = options.zIndex;
    this.accentColor = options.accentColor ?? '#3b82f6';
    this.contentRenderer = options.contentRenderer;
  }

  public update(_rc: RenderContext): void {
    // Custom frame-based updates can be plugged in here
  }

  public draw(rc: RenderContext): void {
    const { ctx } = rc;

    ctx.save();

    // 1. Drop shadow (Soft Mac-style shadow)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 16;

    // 2. Window Container Background (Rounded rectangle)
    const radius = 12;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, radius);
    ctx.fillStyle = '#1e293b'; // Slate-800
    ctx.fill();

    // Reset shadow for inner elements
    ctx.shadowColor = 'transparent';

    // Border stroke
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.stroke();

    // 3. Title bar
    const titleBarHeight = 38;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, titleBarHeight, [radius, radius, 0, 0]);
    ctx.fillStyle = '#0f172a'; // Slate-900
    ctx.fill();

    // 4. Traffic light buttons (Close, Minimize, Maximize)
    const btnRadius = 6;
    const btnY = this.y + titleBarHeight / 2;

    // Red
    ctx.beginPath();
    ctx.arc(this.x + 20, btnY, btnRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    // Yellow
    ctx.beginPath();
    ctx.arc(this.x + 38, btnY, btnRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#eab308';
    ctx.fill();

    // Green
    ctx.beginPath();
    ctx.arc(this.x + 56, btnY, btnRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();

    // 5. Title Text
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.title, this.x + this.width / 2, btnY);

    // 6. zIndex Badge (for live visual debugging)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`z-index: ${this.zIndex}`, this.x + this.width - 16, btnY);

    // 7. Window Body Content
    const bodyX = this.x + 16;
    const bodyY = this.y + titleBarHeight + 16;
    const bodyW = this.width - 32;
    const bodyH = this.height - titleBarHeight - 32;

    if (this.contentRenderer) {
      this.contentRenderer(rc, bodyX, bodyY, bodyW, bodyH);
    } else {
      // Default placeholder content
      ctx.fillStyle = '#64748b';
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`Window ID: ${this.id}`, bodyX, bodyY);
      ctx.fillText(`Layer Active at Frame ${rc.frame} (${(rc.timestampUs / 1e6).toFixed(2)}s)`, bodyX, bodyY + 24);

      // Color accent bar
      ctx.fillStyle = this.accentColor;
      ctx.fillRect(bodyX, bodyY + 54, bodyW, 4);
    }

    ctx.restore();
  }
}
