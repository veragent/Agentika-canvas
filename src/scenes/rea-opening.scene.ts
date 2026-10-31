/**
 * Generated automatically by agentika-canvas CLI
 * Scene: Bedah Arsitektur agentika-canvas
 * Total Duration: 25.75s (1545 frames @ 60 FPS)
 */

import { SceneGraph } from '../core/SceneGraph';
import { CanvasVideoEngine } from '../core/Engine';
import { Camera } from '../core/Camera';
import { MacOSDesktopLayer } from '../kits/macos/MacOSDesktopLayer';
import { GitHubRepoLayer } from '../kits/github/GitHubRepoLayer';
import { WindowLayer } from '../kits/macos/WindowLayer';
import { WebcamWindowLayer } from '../kits/macos/WebcamWindowLayer';
import { CursorLayer, CursorWaypoint } from '../kits/macos/CursorLayer';

export interface SceneBundle {
  engine: CanvasVideoEngine;
  sceneGraph: SceneGraph;
  camera: Camera;
  totalFrames: number;
}

export function createBedahArsitekturagentikacanvasScene(fps = 60): SceneBundle {
  const totalFrames = 1545;
  const sceneGraph = new SceneGraph();
  const camera = new Camera({ enableShake: true, shakeIntensity: 1.8 });

  // 1. macOS Desktop Background
  const desktop = new MacOSDesktopLayer({
    wallpaperStyle: 'sequoia',
    showMenuBar: true,
    activeAppName: 'Agentika Studio',
  });

  // 2. GitHub UI Window
  const github = new GitHubRepoLayer({
    id: 'win-github',
    x: 80,
    y: 60,
    width: 1180,
    height: 720,
    zIndex: 10,
    owner: 'agentika-ai',
    repoName: 'agentika-canvas',
    starStartFrame: 20,
    starEndFrame: Math.min(totalFrames, 180),
    startStars: 48200,
    targetStars: 354890,
  });

  // 3. Antigravity Terminal Window
  const terminal = new WindowLayer({
    id: 'win-terminal',
    title: 'Antigravity CLI — Scaffolding',
    x: 740,
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
      ctx.fillText('$ agy run --scene=bedah arsitektur agentika-canvas', x + 16, y + 28);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('Scene generated from markdown script notes', x + 16, y + 54);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Frame ${rc.frame} / ${totalFrames} | ${rc.timestampUs} µs`, x + 16, y + 84);
    },
  });

  // 4. Presenter Webcam Overlay
  const webcam = new WebcamWindowLayer({
    id: 'win-webcam',
    x: 1420,
    y: 80,
    width: 380,
    height: 380,
    zIndex: 50,
    presenterName: 'Alex Developer',
    resizeStartFrame: Math.round(totalFrames * 0.4),
    resizeEndFrame: Math.round(totalFrames * 0.65),
    targetScale: 0.68,
    targetX: 1540,
    targetY: 620,
  });

  // 5. Cursor Waypoints based on narrative visual notes
  const waypoints: CursorWaypoint[] = [
    { frame: 0, point: { x: 300, y: 200 }, type: 'default' },
    // Beat 1: Selamat datang di bedah arsitektur ...
    { frame: 0, point: { x: 800, y: 500 }, type: 'default' },
    // Beat 2: Mari kita buka repositori GitHub re...
    { frame: 618, point: { x: 1140, y: 142 }, type: 'pointer' },
    // Beat 3: Sekarang kita beralih ke terminal A...
    { frame: 927, point: { x: 800, y: 500 }, type: 'default' },
    // Beat 4: Perhatikan bagaimana jendela webcam...
    { frame: 1236, point: { x: 800, y: 500 }, type: 'default' },
    { frame: totalFrames, point: { x: 960, y: 540 }, type: 'default' },
  ];

  const cursor = new CursorLayer(waypoints);

  // Add layers to scene
  sceneGraph.addLayer(desktop);
  sceneGraph.addLayer(github);
  sceneGraph.addLayer(terminal);
  sceneGraph.addLayer(webcam);
  sceneGraph.addLayer(cursor);

  // Engine instance
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
