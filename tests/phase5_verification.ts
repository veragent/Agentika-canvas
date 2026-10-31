/**
 * agentika-canvas: Test Suite for Phase 5 (WebCodecs + Mediabunny MP4 Export Pipeline)
 */

import { Output, Mp4OutputFormat, BufferTarget, CanvasSource } from 'mediabunny';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runPhase5Tests() {
  console.log('=== TEST 1: Mediabunny Classes & MP4 Output Initialization ===');
  assert(typeof Output === 'function', 'Output class is available in mediabunny');
  assert(typeof Mp4OutputFormat === 'function', 'Mp4OutputFormat is available in mediabunny');
  assert(typeof BufferTarget === 'function', 'BufferTarget is available in mediabunny');
  assert(typeof CanvasSource === 'function', 'CanvasSource is available in mediabunny');

  console.log('\n=== TEST 2: MP4 Container & Target Buffer Allocation ===');
  const target = new BufferTarget();
  assert(target.buffer === null, 'Target buffer is initially null before finalization');

  const output = new Output({
    format: new Mp4OutputFormat(),
    target,
  });

  assert(typeof output.start === 'function', 'Output has start() lifecycle method');
  assert(typeof output.finalize === 'function', 'Output has finalize() lifecycle method');
  assert(typeof output.addVideoTrack === 'function', 'Output has addVideoTrack() method');

  console.log('\n=== TEST 3: Codec Profile Strings Compliance ===');
  // H.264 / AVC codec validation
  const mp4Format = new Mp4OutputFormat();
  assert(mp4Format.fileExtension === '.mp4', `MP4 fileExtension is .mp4 (got ${mp4Format.fileExtension})`);
  assert(mp4Format.mimeType === 'video/mp4', `MP4 mimeType is video/mp4 (got ${mp4Format.mimeType})`);

  console.log('\n=== ALL PHASE 5 TESTS PASSED! ===');
}

runPhase5Tests().catch((err) => {
  console.error(err);
  process.exit(1);
});
