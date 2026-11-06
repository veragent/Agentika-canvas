/**
 * agentika-canvas: Test Suite for Phase 8
 * Scene Pack (Scene-as-Directory) & Render Mission Pipeline
 */

import {
  parseIdentityMd,
  renderIdentityMd,
  ScenePackRegistry,
} from '../src/packs/ScenePack';
import { SceneBundle } from '../src/core/SceneBundle';
import { SceneGraph, CanvasLayer, RenderContext } from '../src/core/SceneGraph';
import { CanvasVideoEngine } from '../src/core/Engine';
import { Camera } from '../src/core/Camera';
import { runMission } from '../src/missions/MissionRunner';
import { renderMissionMarkdown } from '../src/missions/report';
import { assertMissionPassed, estimateExport, MissionGateError } from '../src/missions/exportGate';
import { createTrackingContext, sampleFrameIndices } from '../src/missions/checks';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

/** Simple test layer: draws a filled rect every frame. */
class BoxLayer implements CanvasLayer {
  public id: string;
  public zIndex: number;
  public visible = true;
  constructor(id: string, zIndex: number) {
    this.id = id;
    this.zIndex = zIndex;
  }
  update(_rc: RenderContext) {}
  draw(rc: RenderContext) {
    rc.ctx.fillRect(10, 10, 100, 100);
  }
}

/** Broken layer: writes NaN into its own state during update. */
class NaNLayer implements CanvasLayer {
  public id = 'nan-layer';
  public zIndex = 10;
  public visible = true;
  public progress = 0;
  update(_rc: RenderContext) {
    this.progress = 0 / 0; // NaN — deterministic contamination
  }
  draw(rc: RenderContext) {
    rc.ctx.fillRect(0, 0, 10, 10);
  }
}

/** Silent layer: draws nothing (blank frame suspicion). */
class SilentLayer implements CanvasLayer {
  public id = 'silent-layer';
  public zIndex = 10;
  public visible = true;
  update(_rc: RenderContext) {}
  draw(_rc: RenderContext) {}
}

function buildTestBundle(
  layers: CanvasLayer[],
  opts: { durationInFrames?: number; engineDuration?: number } = {}
): SceneBundle {
  const totalFrames = opts.durationInFrames ?? 120;
  const sceneGraph = new SceneGraph();
  for (const l of layers) sceneGraph.addLayer(l);
  const camera = new Camera({ enableShake: false });
  const engine = new CanvasVideoEngine(
    { width: 1920, height: 1080, fps: 60, durationInFrames: opts.engineDuration ?? totalFrames, camera },
    sceneGraph
  );
  return { engine, sceneGraph, camera, totalFrames };
}

async function runPhase8Tests() {
  console.log('=== TEST 1: IDENTITY.md Parser ===');
  const manifest = parseIdentityMd(`# My Awesome Scene

- id: my-scene
- description: Sebuah scene uji
- tags: opening, github
- kits: macos, github
- style: nesi-nowware
- fps: 30
- resolution: 2560x1440
- version: 2.1.0
`);
  assert(manifest.id === 'my-scene', `id parsed (got '${manifest.id}')`);
  assert(manifest.name === 'My Awesome Scene', `name from H1 (got '${manifest.name}')`);
  assert(manifest.tags.join(',') === 'opening,github', 'tags parsed as list');
  assert(manifest.fps === 30, `fps parsed as number (got ${manifest.fps})`);
  assert(manifest.resolution === '2560x1440', 'resolution parsed');
  assert(manifest.version === '2.1.0', 'version parsed');

  const defaults = parseIdentityMd('# Just A Title\n');
  assert(defaults.id === 'just-a-title', `id slugified from title (got '${defaults.id}')`);
  assert(defaults.fps === 60, 'fps defaults to 60');
  assert(defaults.resolution === '1920x1080', 'resolution defaults to 1080p');
  assert(defaults.tags.length === 0, 'tags default empty');

  const roundTrip = parseIdentityMd(renderIdentityMd(manifest));
  assert(roundTrip.id === manifest.id && roundTrip.fps === manifest.fps, 'renderIdentityMd round-trips');

  console.log('\n=== TEST 2: ScenePackRegistry ===');
  const registry = new ScenePackRegistry();
  const fakeModule = { createScene: () => buildTestBundle([new BoxLayer('box', 10)]) };
  registry.register({
    manifest,
    loadModule: async () => fakeModule,
    loadScene: async () => fakeModule.createScene(),
  });
  assert(registry.size() === 1, 'registry holds one pack');
  assert(registry.has('my-scene'), 'has() by id');
  assert(registry.get('my-scene')?.manifest.name === 'My Awesome Scene', 'get() returns entry');
  assert(registry.list()[0].id === 'my-scene', 'list() returns manifests');
  registry.clear();
  assert(registry.size() === 0, 'clear() empties registry');

  console.log('\n=== TEST 3: Migrated Scene Pack (rea-opening) ===');
  const { createScene, createBedahArsitekturagentikacanvasScene } = await import('../src/scenes/rea-opening/scene');
  assert(typeof createScene === 'function', 'pack exports canonical createScene alias');
  assert(typeof createBedahArsitekturagentikacanvasScene === 'function', 'pack exports named factory');
  const bundle = createScene();
  assert(bundle.totalFrames === 1545, `rea-opening has 1545 frames (got ${bundle.totalFrames})`);
  assert(bundle.engine.fps === 60, 'rea-opening at 60 fps');
  assert(bundle.sceneGraph.getAllLayers().length === 5, 'rea-opening has 5 layers');
  assert(
    bundle.sceneGraph.getAllLayers().every((l) => Number.isFinite(l.zIndex)),
    'all rea-opening zIndex values finite'
  );

  console.log('\n=== TEST 4: Tracking Context & Frame Sampling ===');
  const { ctx, stats } = createTrackingContext(1920, 1080);
  ctx.fillRect(0, 0, 100, 100);
  ctx.fillText('halo', 10, 20);
  assert(stats.drawCalls === 2, `draw calls counted (got ${stats.drawCalls})`);
  ctx.translate(0 / 0, 5);
  assert(stats.nanCalls === 1, `NaN args detected (got ${stats.nanCalls})`);

  const samples = sampleFrameIndices(120, 12);
  assert(samples[0] === 0 && samples[samples.length - 1] === 119, 'samples include first & last frame');
  assert(samples.every((f, i) => i === 0 || f > samples[i - 1]), 'samples strictly increasing');
  assert(sampleFrameIndices(0, 12).length === 0, 'empty timeline yields no samples');

  console.log('\n=== TEST 5: Mission Runner — Healthy scene PASSES ===');
  const healthy = () =>
    buildTestBundle([
      new BoxLayer('win-github', 10),
      new BoxLayer('win-terminal', 20),
      new BoxLayer('win-webcam', 50),
      new BoxLayer('sys-cursor', 999999),
    ]);
  const passReport = await runMission(healthy, { sceneId: 'healthy-scene', sampleFrames: 8 });
  assert(passReport.status === 'passed', `healthy scene passes (got '${passReport.status}')`);
  assert(passReport.attempts.length === 1, 'passed on first attempt');
  assert(passReport.summary.includes('lulus'), 'summary says mission passed');
  const passChecks = passReport.attempts[0].checks;
  assert(passChecks.every((c) => c.passed || c.skipped), 'all deterministic checks passed or skipped');
  const pixelCheck = passChecks.find((c) => c.id === 'pixel-luma');
  assert(pixelCheck?.skipped === true, 'pixel-luma skipped without a probe (Node)');

  console.log('\n=== TEST 6: Mission Runner — Broken layers FAIL the right checks ===');
  const nanScene = () =>
    buildTestBundle([new BoxLayer('box', 10), new NaNLayer('bad', 20)]);
  const nanReport = await runMission(nanScene, { sceneId: 'nan-scene', maxAttempts: 2, sampleFrames: 6 });
  assert(nanReport.status === 'failed', `NaN scene fails (got '${nanReport.status}')`);
  assert(
    nanReport.failureSignature?.includes('layer-state-clean') === true,
    `failure signature names layer-state-clean (got '${nanReport.failureSignature}')`
  );

  const mismatchScene = () => buildTestBundle([new BoxLayer('box', 10)], { durationInFrames: 120, engineDuration: 60 });
  const mismatchReport = await runMission(mismatchScene, { sceneId: 'mismatch', maxAttempts: 1, sampleFrames: 4 });
  assert(mismatchReport.status === 'failed', 'frame-count mismatch fails');
  assert(
    mismatchReport.attempts[0].checks.find((c) => c.id === 'frame-count')?.passed === false,
    'frame-count check flagged the mismatch'
  );

  console.log('\n=== TEST 7: Mission Runner — Same failure 3× → HALTED (Nouride semantics) ===');
  const alwaysBroken = () => buildTestBundle([new NaNLayer('bad', 10)]);
  const haltedReport = await runMission(alwaysBroken, { sceneId: 'halted-scene', maxAttempts: 3, sampleFrames: 4 });
  assert(haltedReport.status === 'halted', `repeated identical failure halts (got '${haltedReport.status}')`);
  assert(haltedReport.totalAttempts === 3, 'halted after exactly maxAttempts attempts');
  assert(haltedReport.summary.includes('dihentikan'), 'halted summary explains the stop');

  console.log('\n=== TEST 8: Reviewer — blank frames get REJECTED ===');
  const blank = () => buildTestBundle([new SilentLayer('void', 10)]);
  const blankReport = await runMission(blank, { sceneId: 'blank-scene', maxAttempts: 1, sampleFrames: 6 });
  assert(blankReport.status === 'failed', `blank scene rejected by reviewer (got '${blankReport.status}')`);
  assert(
    blankReport.failureSignature === 'reviewer:reject',
    `failure signature is reviewer:reject (got '${blankReport.failureSignature}')`
  );

  console.log('\n=== TEST 9: Manual notes force needs-human ===');
  const manualReport = await runMission(healthy, { sceneId: 'manual-scene', sampleFrames: 4 }, { manualNotes: ['Fix cursor timing at frame 90'] });
  assert(
    manualReport.status === 'halted' || manualReport.status === 'failed',
    `unresolved manual notes block the mission (got '${manualReport.status}')`
  );
  assert(manualReport.failureSignature === 'reviewer:needs-human', 'signature is reviewer:needs-human');
  assert(
    manualReport.attempts[0].review?.verdict === 'needs-human',
    'reviewer verdict is needs-human (mission stopped and asked)'
  );

  console.log('\n=== TEST 10: Markdown report rendering ===');
  const md = renderMissionMarkdown(passReport);
  assert(md.startsWith('# Mission Report: healthy-scene'), 'report has scene header');
  assert(md.includes('**PASSED**'), 'report shows PASSED badge');
  assert(md.includes('| frame | timestamp µs | draw calls |'), 'report has evidence table');
  assert(renderMissionMarkdown(haltedReport).includes('HALTED'), 'halted report rendered');

  console.log('\n=== TEST 11: Export Gate ===');
  let threw = false;
  try {
    assertMissionPassed(null);
  } catch (e) {
    threw = e instanceof MissionGateError;
  }
  assert(threw, 'assertMissionPassed(null) throws MissionGateError');

  threw = false;
  try {
    assertMissionPassed(haltedReport);
  } catch (e) {
    threw = e instanceof MissionGateError && (e as Error).message.includes('HALTED');
  }
  assert(threw, 'assertMissionPassed(halted report) throws with status in message');

  assertMissionPassed(passReport);
  assert(true, 'assertMissionPassed(passed report) does not throw');

  console.log('\n=== TEST 12: Pre-Export Risk Assessment (HMADS-render) ===');
  const smallExport = estimateExport({ width: 1920, height: 1080, fps: 60, totalFrames: 360, bitrate: 6_000_000 });
  assert(smallExport.warnings.length === 0, '1080p 6s clip has no warnings');

  const bigExport = estimateExport({ width: 5120, height: 2880, fps: 120, totalFrames: 120 * 900, bitrate: 40_000_000 });
  assert(bigExport.warnings.length >= 3, `heavy export flagged (got ${bigExport.warnings.length} warnings)`);
  assert(bigExport.warnings.some((w) => w.includes('4K')), 'resolution warning present');
  assert(bigExport.warnings.some((w) => w.includes('menit')), 'duration warning present');
  assert(bigExport.warnings.some((w) => w.includes('MB')), 'file size warning present');

  console.log('\n=== ALL PHASE 8 TESTS PASSED! ===');
}

runPhase8Tests().catch((err) => {
  console.error(err);
  process.exit(1);
});
