/**
 * agentika-canvas: CutawayLayer (CanvasLayer implementation)
 * Embeds a full Three.js robotic cutaway engine into agentika-canvas 2D SceneGraph.
 * Can be overlaid with macOS window chrome, terminal windows, HUD readouts, or telemetry.
 */

import * as THREE from 'three';
import { CanvasLayer, RenderContext } from '../../core/SceneGraph';
import { ProceduralRobotModel } from '../../engine/cutaway/ProceduralRobotModel';
import { CutawayMaterialFactory } from '../../effects/CutawayMaterials';
import { CutawaySlot, CutawayTelemetry } from '../../engine/cutaway/types';

export interface CutawayKeyframe {
  frame: number;
  explodeFactor: number;
  slotFactors?: Partial<Record<CutawaySlot, number>>;
  azimuthDeg: number;
  elevationDeg: number;
  distance: number;
  target?: { x: number; y: number; z: number };
}

export interface CutawayLayerOptions {
  id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  zIndex?: number;
  keyframes?: CutawayKeyframe[];
  showTelemetryOverlay?: boolean;
}

export class CutawayLayer implements CanvasLayer {
  public id: string;
  public zIndex: number;
  public visible = true;
  public opacity = 1.0;

  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public showTelemetryOverlay: boolean;

  private keyframes: CutawayKeyframe[];
  private threeScene: THREE.Scene;
  private threeCamera: THREE.PerspectiveCamera;
  private threeRenderer: THREE.WebGLRenderer | null = null;
  private robot: ProceduralRobotModel;
  private offscreenCanvas: HTMLCanvasElement | null = null;

  // Telemetry buffer
  private latestTelemetry: CutawayTelemetry = {
    activePartName: 'Standby',
    partCount: 0,
    explodePercent: 0,
    coreTempCelsius: 42,
    servoTorqueNm: 12.4,
    diagnosticsStatus: 'NOMINAL',
  };

  constructor(options: CutawayLayerOptions = {}) {
    this.id = options.id ?? 'cutaway-robot-layer';
    this.zIndex = options.zIndex ?? 15;
    this.x = options.x ?? 120;
    this.y = options.y ?? 100;
    this.width = options.width ?? 1100;
    this.height = options.height ?? 720;
    this.showTelemetryOverlay = options.showTelemetryOverlay ?? true;

    // Default explosion sequence if none provided
    this.keyframes = options.keyframes ?? [
      { frame: 0, explodeFactor: 0.0, azimuthDeg: 25, elevationDeg: 18, distance: 4.2 },
      { frame: 120, explodeFactor: 0.05, azimuthDeg: 45, elevationDeg: 22, distance: 4.0 },
      { frame: 240, explodeFactor: 0.45, azimuthDeg: 75, elevationDeg: 28, distance: 4.8 },
      { frame: 420, explodeFactor: 0.85, azimuthDeg: 120, elevationDeg: 35, distance: 5.4 },
      { frame: 600, explodeFactor: 1.0, azimuthDeg: 180, elevationDeg: 25, distance: 5.8 },
      { frame: 780, explodeFactor: 0.6, azimuthDeg: 230, elevationDeg: 20, distance: 5.0 },
      { frame: 900, explodeFactor: 0.0, azimuthDeg: 360, elevationDeg: 18, distance: 4.2 },
    ];

    // Setup Three.js scene
    this.threeScene = new THREE.Scene();
    this.threeScene.background = new THREE.Color('#0b101b'); // Dark high-tech studio backdrop

    this.threeCamera = new THREE.PerspectiveCamera(42, this.width / this.height, 0.1, 100);
    CutawayMaterialFactory.setupStudioLighting(this.threeScene);

    this.robot = new ProceduralRobotModel();
    this.threeScene.add(this.robot.rootGroup);

    this.initRenderer();
  }

  private initRenderer() {
    if (typeof document === 'undefined') return; // Headless / dry-run safe

    try {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = this.width;
      this.offscreenCanvas.height = this.height;

      this.threeRenderer = new THREE.WebGLRenderer({
        canvas: this.offscreenCanvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
      });
      this.threeRenderer.setSize(this.width, this.height, false);
      this.threeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.threeRenderer.toneMappingExposure = 1.1;
    } catch {
      // Graceful fallback for non-WebGL environments
      this.threeRenderer = null;
    }
  }

  private interpolateKeyframe(frame: number): CutawayKeyframe {
    if (this.keyframes.length === 0) {
      return { frame: 0, explodeFactor: 0, azimuthDeg: 30, elevationDeg: 20, distance: 4.5 };
    }

    if (frame <= this.keyframes[0].frame) return this.keyframes[0];
    const last = this.keyframes[this.keyframes.length - 1];
    if (frame >= last.frame) return last;

    for (let i = 0; i < this.keyframes.length - 1; i++) {
      const k0 = this.keyframes[i];
      const k1 = this.keyframes[i + 1];
      if (frame >= k0.frame && frame <= k1.frame) {
        const span = k1.frame - k0.frame || 1;
        const rawProgress = (frame - k0.frame) / span;
        // Smooth hermite curve
        const t = rawProgress * rawProgress * (3 - 2 * rawProgress);

        return {
          frame,
          explodeFactor: k0.explodeFactor + (k1.explodeFactor - k0.explodeFactor) * t,
          azimuthDeg: k0.azimuthDeg + (k1.azimuthDeg - k0.azimuthDeg) * t,
          elevationDeg: k0.elevationDeg + (k1.elevationDeg - k0.elevationDeg) * t,
          distance: k0.distance + (k1.distance - k0.distance) * t,
        };
      }
    }

    return this.keyframes[0];
  }

  public update(rc: RenderContext): void {
    const kf = this.interpolateKeyframe(rc.frame);

    // Update orbit camera
    const azRad = (kf.azimuthDeg * Math.PI) / 180;
    const elRad = (kf.elevationDeg * Math.PI) / 180;

    const cx = kf.distance * Math.cos(elRad) * Math.sin(azRad);
    const cy = kf.distance * Math.sin(elRad);
    const cz = kf.distance * Math.cos(elRad) * Math.cos(azRad);

    this.threeCamera.position.set(cx, cy, cz);
    this.threeCamera.lookAt(0, 0, 0);

    // Subtle gentle float sway
    const sway = Math.sin((rc.frame / rc.fps) * 2.2) * 0.05;

    // Apply exploded pose to procedural robot model
    this.latestTelemetry = this.robot.pose({
      explodeFactor: kf.explodeFactor,
      slotFactors: kf.slotFactors,
      rotation: { x: sway * 0.5, y: (rc.frame / rc.fps) * 0.15, z: 0 },
      glowIntensity: Math.abs(Math.sin((rc.frame / rc.fps) * 3.5)),
    });

    if (this.threeRenderer) {
      this.threeRenderer.render(this.threeScene, this.threeCamera);
    }
  }

  public draw(rc: RenderContext): void {
    const { ctx } = rc;

    // 1. Draw WebGL Rendered 3D Scene or High-Tech Wireframe placeholder in CLI/dry-run mode
    if (this.offscreenCanvas && this.threeRenderer) {
      ctx.drawImage(this.offscreenCanvas, this.x, this.y, this.width, this.height);
    } else {
      // Headless / recording proxy mode fallback: Draw crisp high-tech schematic container
      ctx.fillStyle = '#080d1a';
      ctx.fillRect(this.x, this.y, this.width, this.height);

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      // Grid lines
      for (let gx = this.x; gx < this.x + this.width; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx, this.y);
        ctx.lineTo(gx, this.y + this.height);
        ctx.stroke();
      }
      for (let gy = this.y; gy < this.y + this.height; gy += 40) {
        ctx.beginPath();
        ctx.moveTo(this.x, gy);
        ctx.lineTo(this.x + this.width, gy);
        ctx.stroke();
      }

      // Schematic crosshair
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      const midX = this.x + this.width / 2;
      const midY = this.y + this.height / 2;
      ctx.strokeRect(midX - 120, midY - 80, 240, 160);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '16px monospace';
      ctx.fillText(`CUTAWAY 3D SIMULATOR: ${this.latestTelemetry.activePartName.toUpperCase()}`, this.x + 24, this.y + 36);
    }

    // 2. High-Tech Glass Telemetry Overlay
    if (this.showTelemetryOverlay) {
      this.drawTelemetryHUD(ctx);
    }
  }

  private drawTelemetryHUD(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) {
    const pad = 16;
    const hudW = 280;
    const hudH = 145;
    const hx = this.x + this.width - hudW - pad;
    const hy = this.y + pad;

    // Glass panel card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(hx, hy, hudW, hudH);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(hx, hy, hudW, hudH);

    // Accent line
    ctx.fillStyle = '#ff5a1f';
    ctx.fillRect(hx, hy, 4, hudH);

    // Telemetry typography
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('CUTAWAY TELEMETRY / DIAGNOSTICS', hx + 14, hy + 18);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '13px monospace';
    ctx.fillText(`PART : ${this.latestTelemetry.activePartName}`, hx + 14, hy + 42);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText(`STATUS  : ${this.latestTelemetry.diagnosticsStatus}`, hx + 14, hy + 66);
    ctx.fillText(`DISASM  : ${this.latestTelemetry.explodePercent}% EXPLODED`, hx + 14, hy + 88);
    ctx.fillText(`CORE T  : ${this.latestTelemetry.coreTempCelsius}°C`, hx + 14, hy + 110);
    ctx.fillText(`TORQUE  : ${this.latestTelemetry.servoTorqueNm} N·m`, hx + 14, hy + 130);

    // Mini progress bar for disassembly
    const barX = hx + 140;
    const barY = hy + 78;
    const barW = 120;
    const barH = 8;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = this.latestTelemetry.explodePercent > 70 ? '#ff5a1f' : '#10b981';
    ctx.fillRect(barX, barY, (barW * this.latestTelemetry.explodePercent) / 100, barH);
  }
}
