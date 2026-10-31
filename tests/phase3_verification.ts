/**
 * agentika-canvas: Test Suite for Phase 3 (Anti-AI Slop Components & Camera)
 */

import { Camera } from '../src/core/Camera';
import { GitHubRepoLayer } from '../src/kits/github/GitHubRepoLayer';
import { WebcamWindowLayer } from '../src/kits/macos/WebcamWindowLayer';
import { CursorLayer } from '../src/kits/macos/CursorLayer';
import { RenderContext } from '../src/core/SceneGraph';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runPhase3Tests() {
  console.log('=== TEST 1: Camera Harmonic Shake & Micro-Rotation Determinism ===');
  const camera = new Camera({
    enableShake: true,
    shakeIntensity: 2.0,
    shakeFrequency: 1.2,
    rotationalShake: 0.0015,
  });

  const t0 = camera.getTransformAtFrame(0, 60);
  const t60 = camera.getTransformAtFrame(60, 60);
  const t0Again = camera.getTransformAtFrame(0, 60);

  assert(t0.x === t0Again.x && t0.y === t0Again.y && t0.rotation === t0Again.rotation,
    'Camera transform is 100% deterministic between identical frame queries'
  );
  assert(Math.abs(t60.rotation) <= 0.002,
    `Rotational shake is micro-scale (${t60.rotation.toFixed(5)} rad) ensuring crisp small text`
  );

  console.log('\n=== TEST 2: GitHub Repository Layer & Animated Stars Counter ===');
  const github = new GitHubRepoLayer({
    x: 100,
    y: 100,
    width: 1000,
    height: 600,
    starStartFrame: 20,
    starEndFrame: 100,
    startStars: 10000,
    targetStars: 350000,
  });

  const mockRc = (frame: number): RenderContext => ({
    ctx: {} as any,
    frame,
    fps: 60,
    timestampUs: Math.round((frame * 1e6) / 60),
    width: 1920,
    height: 1080,
  });

  github.update(mockRc(0));
  assert((github as any).currentStars === 10000, 'Stars count at frame 0 equals initial stars (10,000)');

  github.update(mockRc(60));
  const midStars = (github as any).currentStars;
  assert(midStars > 10000 && midStars < 350000, `Stars count smoothly interpolated at frame 60: ${midStars}`);

  github.update(mockRc(120));
  assert((github as any).currentStars === 350000, 'Stars count reaches target (350,000) at frame 120');

  console.log('\n=== TEST 3: Webcam Window Deterministic Resizing ===');
  const webcam = new WebcamWindowLayer({
    x: 1400,
    y: 100,
    width: 400,
    height: 400,
    resizeStartFrame: 50,
    resizeEndFrame: 100,
    targetScale: 0.5,
    targetX: 1600,
    targetY: 600,
  });

  webcam.update(mockRc(0));
  assert(webcam.currentWidth === 400 && webcam.currentHeight === 400, 'Webcam starts at full size (400x400)');

  webcam.update(mockRc(100));
  assert(webcam.currentWidth === 200 && webcam.currentHeight === 200, 'Webcam smoothly shrinks to 50% scale (200x200)');
  assert(webcam.currentX === 1600 && webcam.currentY === 600, 'Webcam smoothly repositioned to corner coordinates');

  console.log('\n=== TEST 4: Vector macOS Cursor Waypoint & State Transitions ===');
  const cursor = new CursorLayer([
    { frame: 0, point: { x: 100, y: 100 }, type: 'default' },
    { frame: 40, point: { x: 500, y: 300 }, type: 'pointer' },
    { frame: 80, point: { x: 800, y: 500 }, type: 'resize' },
  ]);

  cursor.update(mockRc(0));
  assert(cursor.cursorType === 'default', 'Cursor starts as default arrow');

  cursor.update(mockRc(40));
  assert(cursor.cursorType === 'pointer', 'Cursor transitions to link pointer at button coordinate');

  cursor.update(mockRc(80));
  assert(cursor.cursorType === 'resize', 'Cursor transitions to NWSE resize arrow at window corner');

  console.log('\n=== ALL PHASE 3 ANTI-AI SLOP TESTS PASSED! ===');
}

runPhase3Tests().catch((err) => {
  console.error(err);
  process.exit(1);
});
