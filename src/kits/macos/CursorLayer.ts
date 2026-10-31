/**
 * agentika-canvas: Mac OS Human Cursor Layer
 * Renders vector macOS cursors with smooth Bezier-like deterministic motion:
 * - default: standard macOS black arrow with crisp white stroke
 * - pointer: macOS pointing hand
 * - resize: diagonal double-sided window resizing cursor (nwse-resize)
 */

import { CanvasLayer, RenderContext } from '../../core/SceneGraph';
import { interpolatePoint, Point2D, Easing } from '../../core/Timeline';

export type CursorType = 'default' | 'pointer' | 'resize';

export interface CursorWaypoint {
  frame: number;
  point: Point2D;
  type?: CursorType;
  easing?: (t: number) => number;
}

export class CursorLayer implements CanvasLayer {
  public id = 'macos-cursor';
  public zIndex = 999999; // Topmost cursor above all desktop windows
  public visible = true;

  public x = 100;
  public y = 100;
  public cursorType: CursorType = 'default';

  private waypoints: CursorWaypoint[] = [];

  constructor(waypoints: CursorWaypoint[] = []) {
    this.setWaypoints(waypoints);
  }

  public setWaypoints(waypoints: CursorWaypoint[]): void {
    this.waypoints = [...waypoints].sort((a, b) => a.frame - b.frame);
  }

  public update(rc: RenderContext): void {
    if (this.waypoints.length === 0) return;

    if (this.waypoints.length === 1) {
      this.x = this.waypoints[0].point.x;
      this.y = this.waypoints[0].point.y;
      this.cursorType = this.waypoints[0].type ?? 'default';
      return;
    }

    const first = this.waypoints[0];
    const last = this.waypoints[this.waypoints.length - 1];

    if (rc.frame <= first.frame) {
      this.x = first.point.x;
      this.y = first.point.y;
      this.cursorType = first.type ?? 'default';
      return;
    }

    if (rc.frame >= last.frame) {
      this.x = last.point.x;
      this.y = last.point.y;
      this.cursorType = last.type ?? 'default';
      return;
    }

    // Find current active segment
    for (let i = 0; i < this.waypoints.length - 1; i++) {
      const p1 = this.waypoints[i];
      const p2 = this.waypoints[i + 1];

      if (rc.frame >= p1.frame && rc.frame < p2.frame) {
        const easing = p1.easing ?? Easing.humanSmooth;
        const pos = interpolatePoint(
          rc.frame,
          [p1.frame, p2.frame],
          p1.point,
          p2.point,
          easing
        );
        this.x = pos.x;
        this.y = pos.y;
        this.cursorType = p1.type ?? 'default';
        return;
      } else if (rc.frame === p2.frame) {
        this.x = p2.point.x;
        this.y = p2.point.y;
        this.cursorType = p2.type ?? 'default';
        return;
      }
    }
  }

  public draw(rc: RenderContext): void {
    const { ctx } = rc;
    ctx.save();
    ctx.translate(this.x, this.y);

    // Realistic drop shadow under cursor
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;

    switch (this.cursorType) {
      case 'pointer':
        this.drawHandPointer(ctx);
        break;
      case 'resize':
        this.drawResizeCursor(ctx);
        break;
      case 'default':
      default:
        this.drawDefaultArrow(ctx);
        break;
    }

    ctx.restore();
  }

  /**
   * macOS Default Black Arrow with White Stroke
   */
  private drawDefaultArrow(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 18);
    ctx.lineTo(4.5, 14);
    ctx.lineTo(9.5, 23);
    ctx.lineTo(12.5, 21.5);
    ctx.lineTo(7.5, 12.5);
    ctx.lineTo(13.5, 12.5);
    ctx.closePath();

    ctx.fillStyle = '#111111';
    ctx.fill();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }

  /**
   * macOS Link Pointer Hand
   */
  private drawHandPointer(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(-5, -2);
    ctx.beginPath();
    // Index finger
    ctx.moveTo(8, 0);
    ctx.lineTo(11, 0);
    ctx.lineTo(11, 10);
    // Other fingers
    ctx.lineTo(14, 10);
    ctx.lineTo(14, 12);
    ctx.lineTo(17, 12);
    ctx.lineTo(17, 15);
    ctx.lineTo(19, 15);
    ctx.lineTo(19, 21);
    ctx.lineTo(14, 25);
    ctx.lineTo(6, 25);
    ctx.lineTo(3, 19);
    ctx.lineTo(3, 14);
    ctx.lineTo(6, 12);
    ctx.lineTo(8, 12);
    ctx.closePath();

    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#111111';
    ctx.stroke();
    ctx.restore();
  }

  /**
   * macOS NWSE Diagonal Window Resize Cursor (Double-ended 45deg arrow)
   */
  private drawResizeCursor(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    ctx.save();
    ctx.rotate(Math.PI / 4); // 45 deg angle

    const length = 11;
    ctx.beginPath();
    // Top arrow head
    ctx.moveTo(0, -length);
    ctx.lineTo(-4, -length + 5);
    ctx.lineTo(-1.5, -length + 5);
    // Stem
    ctx.lineTo(-1.5, length - 5);
    // Bottom arrow head
    ctx.lineTo(-4, length - 5);
    ctx.lineTo(0, length);
    ctx.lineTo(4, length - 5);
    ctx.lineTo(1.5, length - 5);
    // Stem back up
    ctx.lineTo(1.5, -length + 5);
    ctx.lineTo(4, -length + 5);
    ctx.closePath();

    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#111111';
    ctx.stroke();

    ctx.restore();
  }
}
