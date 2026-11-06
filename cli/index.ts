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
 * Output is a Scene PACK directory: <dir>/scene.ts + <dir>/IDENTITY.md
 */
export function generateSceneCode(script: ParsedScript): string {
  const functionName = `create${script.title.replace(/[^a-zA-Z0-9]/g, '')}Scene`;

  return `/**
 * Scene Pack: ${script.title}
 * Generated automatically by agentika-canvas CLI
 * Total Duration: ${script.totalDurationSeconds}s (${script.totalFrames} frames @ ${script.fps} FPS)
 * Manifest: ./IDENTITY.md
 */

import { SceneGraph } from '../../core/SceneGraph';
import { CanvasVideoEngine } from '../../core/Engine';
import { Camera } from '../../core/Camera';
import { SceneBundle } from '../../core/SceneBundle';
import { MacOSDesktopLayer } from '../../kits/macos/MacOSDesktopLayer';
import { GitHubRepoLayer } from '../../kits/github/GitHubRepoLayer';
import { WindowLayer } from '../../kits/macos/WindowLayer';
import { WebcamWindowLayer } from '../../kits/macos/WebcamWindowLayer';
import { CursorLayer, CursorWaypoint } from '../../kits/macos/CursorLayer';

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

/** Scene Pack contract: canonical factory alias. */
export const createScene = ${functionName};
`;
}

/**
 * 2b. Generate the pack IDENTITY.md manifest from a parsed script.
 */
export function generateIdentityMd(script: ParsedScript): string {
  const slug = script.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'scene';

  const actionSet = new Set<string>();
  for (const beat of script.beats) {
    for (const a of beat.actions) actionSet.add(a);
  }

  const tags = ['generated', ...Array.from(actionSet)].join(', ');
  const kits = ['macos', 'github'];

  return `# ${script.title}

- id: ${slug}
- name: ${script.title}
- description: Scene hasil generate dari naskah markdown (${script.beats.length} beat, durasi ${script.totalDurationSeconds}s).
- tags: ${tags}
- kits: ${kits.join(', ')}
- style: nesi-nowware anti-slop
- fps: ${script.fps}
- resolution: 1920x1080
- version: 0.1.0
`;
}

/**
 * 2c. Discover scene packs on disk (Node/CLI side).
 */
export interface DiscoveredPackDir {
  dir: string;      // absolute directory path
  id: string;       // directory name / manifest id
  manifest: string; // raw IDENTITY.md content (or '' when missing)
}

export function discoverPacks(scenesRoot = path.resolve(process.cwd(), 'src/scenes')): DiscoveredPackDir[] {
  if (!fs.existsSync(scenesRoot)) return [];
  const packs: DiscoveredPackDir[] = [];
  for (const name of fs.readdirSync(scenesRoot)) {
    const dir = path.join(scenesRoot, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    if (!fs.existsSync(path.join(dir, 'scene.ts'))) continue;
    const identityPath = path.join(dir, 'IDENTITY.md');
    const manifest = fs.existsSync(identityPath) ? fs.readFileSync(identityPath, 'utf-8') : '';
    packs.push({ dir, id: name, manifest });
  }
  return packs;
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
  npx tsx cli/index.ts generate-scene <script.md> [outputDir]  Generate Scene PACK (scene.ts + IDENTITY.md) from narrative script
  npx tsx cli/index.ts inspect-script <script.md>              Inspect narrative script timing and visual cues
  npx tsx cli/index.ts batch-quiz <quiz.json> [outputDir]      Generate batch quiz video definitions
  npx tsx cli/index.ts packs                                   List discovered scene packs (src/scenes/*/)
  npx tsx cli/index.ts mission <packId|dir> [--report <path>]  Run Render Mission pipeline (checks + reviewer + report.md)
    `);
    process.exit(0);
  }

  if (command === 'generate-scene') {
    const scriptPath = args[1];
    const slugHint = scriptPath ? path.basename(scriptPath).replace(/\\.md$/i, '') : '';
    const outputDir =
      args[2] ||
      path.resolve(process.cwd(), 'src/scenes', slugHint.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'generated-scene');

    if (!scriptPath || !fs.existsSync(scriptPath)) {
      console.error(`Error: File '${scriptPath}' does not exist.`);
      process.exit(1);
    }

    const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
    const parsed = parseMarkdownScript(scriptContent);
    const generatedCode = generateSceneCode(parsed);
    const identity = generateIdentityMd(parsed);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const scenePath = path.join(outputDir, 'scene.ts');
    const identityPath = path.join(outputDir, 'IDENTITY.md');
    fs.writeFileSync(scenePath, generatedCode, 'utf-8');
    fs.writeFileSync(identityPath, identity, 'utf-8');

    console.log(`✓ Scene PACK generated successfully:`);
    console.log(`  ${scenePath}`);
    console.log(`  ${identityPath}`);
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

  if (command === 'packs') {
    const packs = discoverPacks();
    if (packs.length === 0) {
      console.log('Tidak ada scene pack ditemukan di src/scenes/*/ (butuh scene.ts + IDENTITY.md).');
      return;
    }
    console.log(`\n=== SCENE PACKS (${packs.length}) ===\n`);
    for (const p of packs) {
      const manifest = p.manifest ? p.manifest.split('\n').find((l) => l.startsWith('# '))?.replace('# ', '') || p.id : p.id;
      const hasIdentity = p.manifest ? '✓' : '✗ (IDENTITY.md missing)';
      console.log(`  [${p.id}] ${manifest}`);
      console.log(`    dir: ${p.dir}`);
      console.log(`    identity: ${hasIdentity}`);
    }
    console.log('');
    return;
  }

  if (command === 'mission') {
    const target = args[1];
    if (!target) {
      console.error('Error: mission needs a pack id or directory. Usage: mission <packId|dir> [--report <path>]');
      process.exit(1);
    }

    // Parse flags
    const reportIdx = args.indexOf('--report');
    const reportFlag = reportIdx >= 0 ? args[reportIdx + 1] : undefined;

    // Resolve the pack: by id, by absolute/relative dir, or by direct scene.ts path
    const packs = discoverPacks();
    let packDir: string | undefined;
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      packDir = path.resolve(target);
    } else if (fs.existsSync(target) && target.endsWith('.ts')) {
      packDir = path.dirname(path.resolve(target));
    } else {
      const found = packs.find((p) => p.id === target);
      if (!found) {
        console.error(`Error: pack '${target}' tidak ditemukan. Jalankan 'packs' untuk daftar.`);
        process.exit(1);
      }
      packDir = found.dir;
    }

    const scenePath = path.join(packDir, 'scene.ts');
    if (!fs.existsSync(scenePath)) {
      console.error(`Error: ${scenePath} tidak ditemukan — bukan scene pack yang valid.`);
      process.exit(1);
    }

    const packId = path.basename(packDir);

    // Dynamic import of the TS scene module (tsx registers the loader)
    const { pathToFileURL } = await import('node:url');
    const sceneModule = (await import(pathToFileURL(scenePath).href)) as {
      createScene: (fps?: number) => import('../src/core/SceneBundle').SceneBundle;
    };
    if (typeof sceneModule.createScene !== 'function') {
      console.error(`Error: ${scenePath} tidak mengekspor createScene().`);
      process.exit(1);
    }

    console.log(`\n=== RENDER MISSION: ${packId} ===`);
    console.log(`Scene: ${scenePath}`);
    console.log(`Checks: frame-count, duration-sanity, resolution-sanity, timeline-monotonic, zindex-cap, render-clean, draw-density, layer-state-clean, camera-state-clean`);
    console.log(`(pixel-luma: skipped — pixel probe hanya tersedia dari Studio browser)\n`);

    const { runMission } = await import('../src/missions/MissionRunner');
    const { renderMissionMarkdown } = await import('../src/missions/report');

    const report = await runMission(
      () => sceneModule.createScene(),
      { sceneId: packId, maxAttempts: 3, sampleFrames: 12 },
      {}
    );

    const md = renderMissionMarkdown(report);
    const reportPath = reportFlag || path.join(packDir, 'report.md');
    fs.writeFileSync(reportPath, md, 'utf-8');

    console.log(`\nStatus: ${report.status.toUpperCase()}`);
    console.log(`Attempts: ${report.totalAttempts}/${report.maxAttempts}`);
    console.log(report.summary);
    console.log(`\nReport: ${reportPath}`);

    if (report.status !== 'passed') {
      process.exit(1); // CI-friendly: non-zero on real problems (doctor pattern)
    }
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
