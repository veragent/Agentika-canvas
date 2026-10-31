/**
 * agentika-canvas: Test & Verification Suite for Phase 1 & Phase 2
 * Tests SceneGraph dynamic z-index, Timeline determinism, and WebCodecs constants.
 */

import { SceneGraph, CanvasLayer, RenderContext } from '../src/core/SceneGraph';
import { interpolate, interpolatePoint, Easing, frameToTimestampUs } from '../src/core/Timeline';
import { TARGET_VIDEO_CODECS, TARGET_AUDIO_CODECS } from '../src/core/Capabilities';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

class MockLayer implements CanvasLayer {
  public id: string;
  public zIndex: number;
  public visible = true;
  public drawOrder: number[] = [];

  constructor(id: string, zIndex: number) {
    this.id = id;
    this.zIndex = zIndex;
  }

  update(_rc: RenderContext) {}
  draw(_rc: RenderContext) {
    this.drawOrder.push(this.zIndex);
  }
}

async function runVerification() {
  console.log('=== TEST 1: Phase 1 Codec Standard Constants ===');
  assert(TARGET_VIDEO_CODECS.some(c => c.codec === 'avc1.4d0034'), 'H.264 avc1.4d0034 present');
  assert(TARGET_VIDEO_CODECS.some(c => c.codec === 'vp09.00.40.08.00'), 'VP9 vp09.00.40.08.00 present');
  assert(TARGET_AUDIO_CODECS.some(c => c.codec === 'mp4a.40.2'), 'AAC mp4a.40.2 present');

  console.log('\n=== TEST 2: Phase 2 Timeline Determinism & Microsecond Math ===');
  // At 60 FPS:
  // Frame 0 = 0 µs
  // Frame 30 = 500,000 µs (0.5s)
  // Frame 60 = 1,000,000 µs (1.0s)
  assert(frameToTimestampUs(0, 60) === 0, 'Frame 0 -> 0 µs');
  assert(frameToTimestampUs(30, 60) === 500000, 'Frame 30 -> 500,000 µs');
  assert(frameToTimestampUs(60, 60) === 1000000, 'Frame 60 -> 1,000,000 µs');

  // Interpolation linearity
  const valAtMid = interpolate(15, [0, 30], [100, 200], Easing.linear);
  assert(valAtMid === 150, `Linear interpolation at midpoint: ${valAtMid} === 150`);

  // Clamp behavior beyond boundary
  const valPastEnd = interpolate(50, [0, 30], [10, 50], Easing.linear);
  assert(valPastEnd === 50, `Interpolation clamped past end: ${valPastEnd} === 50`);

  // 2D Point Interpolation
  const pt = interpolatePoint(15, [0, 30], { x: 0, y: 100 }, { x: 100, y: 200 }, Easing.linear);
  assert(pt.x === 50 && pt.y === 150, `2D Point interpolation: (${pt.x}, ${pt.y}) === (50, 150)`);

  console.log('\n=== TEST 3: Phase 2 SceneGraph Dynamic z-index & Auto-Sorting ===');
  const sg = new SceneGraph();
  const layerA = new MockLayer('win-A', 1);
  const layerB = new MockLayer('win-B', 2);
  const layerC = new MockLayer('win-C', 3);

  sg.addLayer(layerA).addLayer(layerB).addLayer(layerC);

  // Initial order: A (1) -> B (2) -> C (3)
  let sorted = sg.getSortedVisibleLayers();
  assert(sorted[0].id === 'win-A' && sorted[2].id === 'win-C', 'Initial ascending z-index sort correct (A, B, C)');

  // Now focus Window A!
  // Window A must get max(1, 2, 3) + 1 = 4
  const newZ = sg.focusWindow('win-A');
  assert(newZ === 4, `focusWindow('win-A') updated zIndex to 4 (was ${newZ})`);

  sorted = sg.getSortedVisibleLayers();
  assert(sorted[0].id === 'win-B' && sorted[1].id === 'win-C' && sorted[2].id === 'win-A',
    'Window A is now topmost layer in render order without altering JSX/DOM!'
  );

  // Focus Window B!
  sg.focusWindow('win-B');
  sorted = sg.getSortedVisibleLayers();
  assert(sorted[2].id === 'win-B' && layerB.zIndex === 5,
    'Window B is now topmost layer with zIndex 5'
  );

  console.log('\n=== ALL PHASE 1 & PHASE 2 TESTS PASSED! ===');
}

runVerification().catch(err => {
  console.error(err);
  process.exit(1);
});
