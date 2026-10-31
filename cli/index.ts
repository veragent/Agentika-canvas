#!/usr/bin/env node
/**
 * agentika-canvas: Antigravity CLI Automation & Script-to-Scene Pipeline
 * Converts narrative Markdown scripts with visual notes into deterministic
 * TypeScript scene files, and automates database-driven batch video creation.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface ScriptBeat {
  index: number;
  narration: string;
  visualNote: string;
  wordCount: number;
  durationSeconds: number;
  startFrame: number;
  endFrame: number;
  actions: string[];
}

export interface ParsedScript {
  title: string;
  totalDurationSeconds: number;
  totalFrames: number;
  fps: number;
  beats: ScriptBeat[];
}

/**
 * 1. Parse Markdown Script with Visual Cues
 * Format:
 * > Narasi: "..."
 * [Visual]: ...
 */
export function parseMarkdownScript(content: string, fps = 60): ParsedScript {
  const lines = content.split('\n');
  let title = 'Untitled Scene';

  const beats: ScriptBeat[] = [];
  let currentNarration = '';
  let currentVisual = '';
  let accumulatedFrames = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('# ') && title === 'Untitled Scene') {
      title = line.replace('# ', '').trim();
      continue;
    }

    if (line.startsWith('>')) {
      // Narration block
      const cleanNarration = line.replace(/^>\s*(Narasi\s*\d*:\s*)?/i, '').replace(/^"|"$/g, '').trim();
      if (cleanNarration) {
        currentNarration = currentNarration ? `${currentNarration} ${cleanNarration}` : cleanNarration;
      }
    } else if (line.startsWith('[Visual]') || line.startsWith('[visual]')) {
      // Visual cue block
      currentVisual = line.replace(/^\[Visual\]:\s*/i, '').trim();

      if (currentNarration) {
        // Calculate beat timing: ~140 words per minute -> 2.33 words/sec
        const words = currentNarration.split(/\s+/).filter(Boolean);
        const wordCount = Math.max(1, words.length);
        const durationSec = Math.max(2.0, Number((wordCount / 2.33).toFixed(2)));
        const beatFrames = Math.round(durationSec * fps);

        const actions: string[] = [];
        const lowerVis = currentVisual.toLowerCase();
        if (lowerVis.includes('focus') || lowerVis.includes('klik jendela')) {
          actions.push('focusWindow');
        }
        if (lowerVis.includes('star') || lowerVis.includes('bintang')) {
          actions.push('animateStars');
        }
        if (lowerVis.includes('kursor') || lowerVis.includes('cursor')) {
          actions.push('moveCursor');
        }
        if (lowerVis.includes('webcam') && (lowerVis.includes('kecil') || lowerVis.includes('shrink'))) {
          actions.push('resizeWebcam');
        }

        beats.push({
          index: beats.length + 1,
          narration: currentNarration,
          visualNote: currentVisual,
          wordCount,
          durationSeconds: durationSec,
          startFrame: accumulatedFrames,
          endFrame: accumulatedFrames + beatFrames,
          actions,
        });

        accumulatedFrames += beatFrames;
        currentNarration = '';
        currentVisual = '';
      }
    }
  }

  // Handle trailing narration if any
  if (currentNarration) {
    const words = currentNarration.split(/\s+/).filter(Boolean);
    const wordCount = Math.max(1, words.length);
    const durationSec = Math.max(2.0, Number((wordCount / 2.33).toFixed(2)));
    const beatFrames = Math.round(durationSec * fps);

    beats.push({
      index: beats.length + 1,
      narration: currentNarration,
      visualNote: currentVisual || 'Default scene backdrop',
      wordCount,
      durationSeconds: durationSec,
      startFrame: accumulatedFrames,
      endFrame: accumulatedFrames + beatFrames,
      actions: [],
    });

    accumulatedFrames += beatFrames;
  }

  return {
    title,
    totalDurationSeconds: Number((accumulatedFrames / fps).toFixed(2)),
    totalFrames: accumulatedFrames,
    fps,
    beats,
  };
}

/**
 * 2. Generate TypeScript Scene Scaffold from Parsed Script
 */
export function generateSceneCode(script: ParsedScript): string {
  const functionName = `create${script.title.replace(/[^a-zA-Z0-9]/g, '')}Scene`;

  return `/**
 * Generated automatically by agentika-canvas CLI
 * Scene: ${script.title}
 * Total Duration: ${script.totalDurationSeconds}s (${script.totalFrames} frames @ ${script.fps} FPS)
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

export function ${functionName}(fps = ${script.fps}): SceneBundle {
  const totalFrames = ${script.totalFrames};
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
      ctx.fillText('$ agy run --scene=${script.title.toLowerCase().replace(/\\s+/g, '-')}', x + 16, y + 28);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('Scene generated from markdown script notes', x + 16, y + 54);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(\`Frame \${rc.frame} / \${totalFrames} | \${rc.timestampUs} µs\`, x + 16, y + 84);
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
${script.beats
  .map((beat) => {
    const isPointer = beat.actions.includes('animateStars');
    const isResize = beat.actions.includes('resizeWebcam');
    const type = isPointer ? 'pointer' : isResize ? 'resize' : 'default';
    const x = isPointer ? 1140 : isResize ? 1420 : 800;
    const y = isPointer ? 142 : isResize ? 80 : 500;
    return `    // Beat ${beat.index}: ${beat.narration.slice(0, 35)}...
    { frame: ${beat.startFrame}, point: { x: ${x}, y: ${y} }, type: '${type}' },`;
  })
  .join('\n')}
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
`;
}

/**
 * 3. CLI Command Handler
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(`
agentika-canvas Antigravity CLI Automation
Usage:
  npx tsx cli/index.ts generate-scene <script.md> [output.ts]   Generate TS scene file from narrative script
  npx tsx cli/index.ts batch-quiz <quiz.json> [outputDir]      Generate batch quiz video definitions
  npx tsx cli/index.ts inspect-script <script.md>              Inspect narrative script timing and visual cues
    `);
    process.exit(0);
  }

  if (command === 'generate-scene') {
    const scriptPath = args[1];
    const outputPath = args[2] || path.resolve(process.cwd(), 'src/scenes/rea-opening.scene.ts');

    if (!scriptPath || !fs.existsSync(scriptPath)) {
      console.error(`Error: File '${scriptPath}' does not exist.`);
      process.exit(1);
    }

    const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
    const parsed = parseMarkdownScript(scriptContent);
    const generatedCode = generateSceneCode(parsed);

    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, generatedCode, 'utf-8');
    console.log(`✓ Scene generated successfully: ${outputPath}`);
    console.log(`  Title: ${parsed.title}`);
    console.log(`  Duration: ${parsed.totalDurationSeconds}s (${parsed.totalFrames} frames)`);
    console.log(`  Beats: ${parsed.beats.length} visual beats`);
    return;
  }

  if (command === 'inspect-script') {
    const scriptPath = args[1];
    if (!scriptPath || !fs.existsSync(scriptPath)) {
      console.error(`Error: File '${scriptPath}' does not exist.`);
      process.exit(1);
    }

    const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
    const parsed = parseMarkdownScript(scriptContent);

    console.log(`\n=== SCRIPT INSPECTION: ${parsed.title} ===`);
    console.log(`Total Duration: ${parsed.totalDurationSeconds}s | ${parsed.totalFrames} frames @ ${parsed.fps} FPS`);
    console.log(`Total Beats: ${parsed.beats.length}\n`);

    parsed.beats.forEach((b) => {
      console.log(`Beat ${b.index} [Frames ${b.startFrame} -> ${b.endFrame} | ${b.durationSeconds}s]:`);
      console.log(`  Narration : "${b.narration}"`);
      console.log(`  Visual Cue: [${b.visualNote}]`);
      console.log(`  Actions   : ${b.actions.join(', ') || 'none'}\n`);
    });
    return;
  }

  if (command === 'batch-quiz') {
    const jsonPath = args[1];
    if (!jsonPath || !fs.existsSync(jsonPath)) {
      console.error(`Error: JSON file '${jsonPath}' does not exist.`);
      process.exit(1);
    }

    const quizData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const items = Array.isArray(quizData) ? quizData : [quizData];

    console.log(`✓ Loaded ${items.length} quiz items for batch rendering pipeline.`);
    items.forEach((item, idx) => {
      console.log(`  [${idx + 1}] ID:${item.id} - ${item.question} (Category: ${item.category})`);
    });
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

import { fileURLToPath } from 'node:url';

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
