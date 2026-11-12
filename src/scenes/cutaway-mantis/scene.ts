/**
 * Scene Pack: cutaway-mantis — Exploded Robotic Machine Simulator
 * 15-second high-precision 60fps cutaway demonstration
 * Disassembles optics, shells, planetary gears, and servos under dedicated cameras.
 */

import { SceneGraph } from '../../core/SceneGraph';
import { CanvasVideoEngine } from '../../core/Engine';
import { Camera } from '../../core/Camera';
import { SceneBundle } from '../../core/SceneBundle';
import { MacOSDesktopLayer } from '../../kits/macos/MacOSDesktopLayer';
import { WindowLayer } from '../../kits/macos/WindowLayer';
import { CutawayLayer } from '../../kits/cutaway/CutawayLayer';
import { CursorLayer, CursorWaypoint } from '../../kits/macos/CursorLayer';

export function createCutawayMantisScene(fps = 60): SceneBundle {
  const totalFrames = 900; // 15 seconds @ 60 FPS
  const sceneGraph = new SceneGraph();
  const camera = new Camera({ enableShake: false });

  // 1. Dark Studio High-Tech Wallpaper
  const desktop = new MacOSDesktopLayer({
    wallpaperStyle: 'sequoia',
    showMenuBar: true,
    activeAppName: 'Cutaway Studio 3D',
  });

  // 2. The 3D Cutaway Interactive Simulator Window
  const cutaway3D = new CutawayLayer({
    id: 'cutaway-robot-viewport',
    x: 80,
    y: 80,
    width: 1240,
    height: 740,
    zIndex: 10,
    keyframes: [
      { frame: 0, explodeFactor: 0.0, azimuthDeg: 25, elevationDeg: 18, distance: 4.2 },
      { frame: 150, explodeFactor: 0.15, azimuthDeg: 45, elevationDeg: 24, distance: 4.0 },
      { frame: 320, explodeFactor: 0.55, azimuthDeg: 80, elevationDeg: 30, distance: 4.9 },
      { frame: 540, explodeFactor: 1.0, azimuthDeg: 140, elevationDeg: 34, distance: 5.6 },
      { frame: 720, explodeFactor: 0.4, azimuthDeg: 210, elevationDeg: 22, distance: 4.8 },
      { frame: 900, explodeFactor: 0.0, azimuthDeg: 360, elevationDeg: 18, distance: 4.2 },
    ],
    showTelemetryOverlay: true,
  });

  // 3. Side Inspector Window: Diagnostics & Part Explode Triggers
  const inspectorWin = new WindowLayer({
    id: 'win-inspector',
    title: 'Cutaway Part Diagnostics & Sub-Assemblies',
    x: 1350,
    y: 80,
    width: 490,
    height: 740,
    zIndex: 20,
    accentColor: '#ff5a1f',
    contentRenderer: (rc, x, y, w, h) => {
      const { ctx } = rc;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x, y, w, h);

      ctx.fillStyle = '#ff5a1f';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('SUB-ASSEMBLY STACK', x + 20, y + 36);

      const parts = [
        { name: '1. OPTICS SENSOR TURRET', status: 'UNLOCKED / EXTENDED', color: '#38bdf8' },
        { name: '2. DORSAL COMPOSITE COWL', status: 'EXPLODED (+1.6m)', color: '#10b981' },
        { name: '3. PORT/STBD GEAR TRAIN', status: 'SEPARATED (4-AXIS)', color: '#fbbf24' },
        { name: '4. VECTORING SERVO GIMBAL', status: 'DECOUPLED', color: '#f43f5e' },
        { name: '5. QUANTUM CORE REACTOR', status: 'ISOLATED (NOMINAL)', color: '#a855f7' },
      ];

      parts.forEach((p, idx) => {
        const itemY = y + 75 + idx * 72;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x + 16, itemY, w - 32, 60);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(p.name, x + 28, itemY + 24);

        ctx.fillStyle = p.color;
        ctx.font = '11px monospace';
        ctx.fillText(`STATUS: ${p.status}`, x + 28, itemY + 45);
      });

      // Bottom Checklist Verification status
      const bottomY = y + h - 140;
      ctx.fillStyle = '#111827';
      ctx.fillRect(x + 16, bottomY, w - 32, 115);
      ctx.strokeStyle = '#ff5a1f';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 16, bottomY, w - 32, 115);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('CUTAWAY REVIEW GATE: APPROVED', x + 28, bottomY + 28);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px monospace';
      ctx.fillText('• Dark Mechanism Ratio : 0.84 (>= 0.80)', x + 28, bottomY + 50);
      ctx.fillText('• 60 FPS Orbit Camera   : ACTIVE', x + 28, bottomY + 70);
      ctx.fillText('• Render Frame          : ' + rc.frame + ' / ' + totalFrames, x + 28, bottomY + 90);
    },
  });

  // 4. Operator Cursor Waypoints (Hovering & triggering explosion sequence)
  const waypoints: CursorWaypoint[] = [
    { frame: 0, point: { x: 400, y: 300 }, type: 'default' },
    { frame: 200, point: { x: 1450, y: 180 }, type: 'pointer' },
    { frame: 450, point: { x: 700, y: 450 }, type: 'default' },
    { frame: 700, point: { x: 1450, y: 320 }, type: 'pointer' },
    { frame: totalFrames, point: { x: 960, y: 540 }, type: 'default' },
  ];
  const cursor = new CursorLayer(waypoints);

  // Register layers
  sceneGraph.addLayer(desktop);
  sceneGraph.addLayer(cutaway3D);
  sceneGraph.addLayer(inspectorWin);
  sceneGraph.addLayer(cursor);

  // Video engine instance
  const engine = new CanvasVideoEngine(
    {
      width: 1920,
      height: 1080,
      fps,
      durationInFrames: totalFrames,
      camera,
      backgroundColor: '#020617',
    },
    sceneGraph
  );

  return {
    engine,
    sceneGraph,
    camera,
    totalFrames,
  };
}

export const createScene = createCutawayMantisScene;
