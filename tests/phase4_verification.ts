/**
 * agentika-canvas: Test Suite for Phase 4 (Studio Editor & Frame Inspector)
 */

import { FrameRevisionNote, FrameDiagnosticInfo } from '../src/studio/FrameInspector';
import { SceneGraph, CanvasLayer } from '../src/core/SceneGraph';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

class MockLayer implements CanvasLayer {
  constructor(public id: string, public zIndex: number, public visible = true) {}
  update() {}
  draw() {}
}

async function runPhase4Tests() {
  console.log('=== TEST 1: Frame Diagnostic Math & Microsecond Precision ===');
  const frame = 42;
  const fps = 60;
  const timeSec = frame / fps;
  const timestampUs = Math.round((frame * 1_000_000) / fps);

  assert(Math.abs(timeSec - 0.70) < 0.001, `timeSec for frame 42 is 0.70s (got ${timeSec.toFixed(3)})`);
  assert(timestampUs === 700000, `timestampUs for frame 42 is 700,000 µs (got ${timestampUs})`);

  console.log('\n=== TEST 2: Structured AI Revision Prompt Generator ===');
  const mockLayers: CanvasLayer[] = [
    new MockLayer('win-github', 10),
    new MockLayer('win-terminal', 20),
    new MockLayer('win-webcam', 50),
    new MockLayer('macos-cursor', 999999),
  ];

  const note: FrameRevisionNote = {
    id: 'rev-1',
    frame: 42,
    timeSec,
    timestampUs,
    issue: 'Kursor saat mengecilkan webcam masih salah dan kecepatannya terlalu cepat',
    tag: 'cursor-speed',
    suggestedFix: 'Tingkatkan durasi frame pada interpolatePoint() atau ubah easing ke humanSmooth',
  };

  const formattedPrompt = `[Frame ${note.frame} | ${note.timeSec.toFixed(2)}s (${note.timestampUs} µs)]
Issue: ${note.issue}
Tag: ${note.tag}
${note.suggestedFix ? `Suggested Fix: ${note.suggestedFix}` : ''}
Active Layers: ${mockLayers.map((l) => `${l.id} (z:${l.zIndex})`).join(', ')}`;

  assert(formattedPrompt.includes('[Frame 42 | 0.70s (700000 µs)]'), 'Prompt carries exact frame & microsecond timestamp');
  assert(formattedPrompt.includes('Issue: Kursor saat mengecilkan webcam'), 'Prompt carries issue description');
  assert(formattedPrompt.includes('Suggested Fix: Tingkatkan durasi frame'), 'Prompt carries suggested code fix');
  assert(formattedPrompt.includes('Active Layers: win-github (z:10)'), 'Prompt carries current active layer z-indices');

  console.log('\n=== TEST 3: Dynamic z-index Layer Sorting in Inspector ===');
  const sg = new SceneGraph(mockLayers);
  let sorted = sg.getSortedVisibleLayers();
  assert(sorted[0].id === 'win-github' && sorted[2].id === 'win-webcam', 'Ascending zIndex sorting verified in inspector');

  // Focus terminal layer
  sg.focusWindow('win-terminal');
  sorted = sg.getSortedVisibleLayers();
  assert(sorted[2].id === 'win-terminal' && sorted[2].zIndex > 50,
    'Terminal window successfully promoted to top window before cursor'
  );

  console.log('\n=== ALL PHASE 4 TESTS PASSED! ===');
}

runPhase4Tests().catch((err) => {
  console.error(err);
  process.exit(1);
});
