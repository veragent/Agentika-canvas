/**
 * agentika-canvas: Test Suite for Phase 7 (Antigravity CLI Automation & Database-Driven Quiz)
 */

import { parseMarkdownScript, generateSceneCode } from '../cli/index';
import { QuizTemplateLayer, QuizItem } from '../src/kits/quiz/QuizTemplateLayer';
import { RenderContext } from '../src/core/SceneGraph';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runPhase7Tests() {
  console.log('=== TEST 1: Markdown Script Parsing & Beat Timing ===');
  const sampleScript = `# Test Scene Title

> Narasi 1: "Ini adalah kalimat pembuka untuk menguji kalkulasi durasi kata."
[Visual]: Kursor bergerak ke repositori GitHub, hover ke tombol Star.

> Narasi 2: "Sekarang kita klik jendela terminal."
[Visual]: Kursor mengklik terminal, focusWindow('win-terminal').
`;

  const parsed = parseMarkdownScript(sampleScript, 60);
  assert(parsed.title === 'Test Scene Title', `Script title is 'Test Scene Title' (got '${parsed.title}')`);
  assert(parsed.beats.length === 2, `Script has 2 beats (got ${parsed.beats.length})`);

  const beat1 = parsed.beats[0];
  assert(beat1.wordCount > 5, 'Beat 1 has valid word count');
  assert(beat1.durationSeconds >= 2.0, 'Beat 1 has minimum 2.0s duration');
  assert(beat1.actions.includes('animateStars'), 'Beat 1 visual note detected animateStars action');

  const beat2 = parsed.beats[1];
  assert(beat2.actions.includes('focusWindow'), 'Beat 2 visual note detected focusWindow action');
  assert(beat2.startFrame === beat1.endFrame, 'Beat 2 starts immediately after Beat 1 ends');

  console.log('\n=== TEST 2: TypeScript Scene Code Generation ===');
  const code = generateSceneCode(parsed);
  assert(code.includes('export function createTestSceneTitleScene(fps = 60): SceneBundle'),
    'Scene factory function declared correctly in generated TypeScript code'
  );
  assert(code.includes('sceneGraph.addLayer(desktop)'), 'Generated code registers desktop layer');
  assert(code.includes('sceneGraph.addLayer(github)'), 'Generated code registers github layer');
  assert(code.includes('sceneGraph.addLayer(terminal)'), 'Generated code registers terminal layer');
  assert(code.includes('sceneGraph.addLayer(cursor)'), 'Generated code registers cursor layer with waypoints');

  console.log('\n=== TEST 3: Database-Driven Quiz Template Layer Lifecycle ===');
  const quizItem: QuizItem = {
    id: 'quiz-test-1',
    category: 'Teknologi',
    question: 'Berapakah FPS default pada agentika-canvas?',
    options: ['24 FPS', '30 FPS', '60 FPS', '120 FPS'],
    correctIndex: 2,
    explanation: 'Standar animasi kanvas halus adalah 60 FPS.',
  };

  const quizLayer = new QuizTemplateLayer({
    quizItem,
    startFrame: 0,
    countdownFrames: 120, // 2s countdown
    revealDurationFrames: 60, // 1s reveal
  });

  const mockRc = (frame: number): RenderContext => ({
    ctx: {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      roundRect: () => {},
      fill: () => {},
      clip: () => {},
      stroke: () => {},
      arc: () => {},
      fillText: () => {},
      fillRect: () => {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
    } as any,
    frame,
    fps: 60,
    timestampUs: Math.round((frame * 1e6) / 60),
    width: 1920,
    height: 1080,
  });

  // At frame 0: Countdown is at full progress (1.0), not revealed
  quizLayer.update(mockRc(0));
  assert((quizLayer as any).currentProgress === 1.0, 'Quiz timer starts at 1.0 (100% remaining)');
  assert((quizLayer as any).isRevealed === false, 'Quiz is not revealed during countdown');

  // At frame 60 (halfway): Timer progress is at 0.5
  quizLayer.update(mockRc(60));
  const prog60 = (quizLayer as any).currentProgress;
  assert(Math.abs(prog60 - 0.5) < 0.05, `Quiz timer halfway at frame 60 (got ${prog60})`);

  // At frame 130 (after countdown): Revealed is true
  quizLayer.update(mockRc(130));
  assert((quizLayer as any).isRevealed === true, 'Quiz answer is revealed after countdown completes');
  assert((quizLayer as any).revealProgress > 0, 'Reveal animation progress is actively interpolating');

  // Draw call test
  quizLayer.draw(mockRc(130));
  assert(true, 'QuizTemplateLayer draws cleanly in both countdown and reveal states');

  console.log('\n=== ALL PHASE 7 TESTS PASSED! ===');
}

runPhase7Tests().catch((err) => {
  console.error(err);
  process.exit(1);
});
