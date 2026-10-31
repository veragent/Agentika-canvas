/**
 * agentika-canvas: Test Suite for Phase 6 (Demuxer & External Media Ingestion)
 */

import { PreciseVideoReader, MultiFormatDemuxerReader } from '../src/media/MediaIngestion';
import { ExternalVideoLayer } from '../src/kits/ExternalVideoLayer';
import { WebDemuxer, AVMediaType } from 'web-demuxer';
import { RenderContext } from '../src/core/SceneGraph';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runPhase6Tests() {
  console.log('=== TEST 1: Media Ingestion Readers Architecture ===');
  assert(typeof PreciseVideoReader === 'function', 'PreciseVideoReader class exists');
  assert(typeof MultiFormatDemuxerReader === 'function', 'MultiFormatDemuxerReader class exists');

  const preciseReader = new PreciseVideoReader();
  assert(typeof preciseReader.load === 'function', 'PreciseVideoReader has load() method');
  assert(typeof preciseReader.getSampleAt === 'function', 'PreciseVideoReader has getSampleAt() method');
  assert(typeof preciseReader.close === 'function', 'PreciseVideoReader has close() method');

  console.log('\n=== TEST 2: Multi-Format WebDemuxer Integration ===');
  assert(typeof WebDemuxer === 'function', 'WebDemuxer class exported from web-demuxer package');
  assert(AVMediaType.AVMEDIA_TYPE_VIDEO === 0, 'AVMediaType.AVMEDIA_TYPE_VIDEO enum value === 0');
  assert(AVMediaType.AVMEDIA_TYPE_AUDIO === 1, 'AVMediaType.AVMEDIA_TYPE_AUDIO enum value === 1');

  const demuxerReader = new MultiFormatDemuxerReader('/wasm-files/web-demuxer.wasm');
  assert(typeof demuxerReader.load === 'function', 'MultiFormatDemuxerReader has load() method');
  assert(typeof demuxerReader.seekAndDecode === 'function', 'MultiFormatDemuxerReader has seekAndDecode() method');
  assert(typeof demuxerReader.close === 'function', 'MultiFormatDemuxerReader has close() method');

  console.log('\n=== TEST 3: ExternalVideoLayer Timeline Synchronization ===');
  const extLayer = new ExternalVideoLayer({
    id: 'test-ext-video',
    x: 100,
    y: 100,
    width: 640,
    height: 360,
    timelineStartFrame: 0,
    timelineEndFrame: 300,
    videoStartOffsetSec: 5.0, // starts at 5.0s into video clip
  });

  const mockRc = (frame: number): RenderContext => ({
    ctx: {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      roundRect: () => {},
      fill: () => {},
      clip: () => {},
      drawImage: () => {},
      stroke: () => {},
      fillRect: () => {},
      fillText: () => {},
      moveTo: () => {},
      lineTo: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
    } as any,
    frame,
    fps: 60,
    timestampUs: Math.round((frame * 1e6) / 60),
    width: 1920,
    height: 1080,
  });

  // Test at frame 0
  extLayer.update(mockRc(0));
  assert((extLayer as any).currentVideoTimeSec === 5.0, 'Frame 0 starts at offset 5.000s');

  // Test at frame 60 (1 second later at 60fps)
  extLayer.update(mockRc(60));
  const time60 = (extLayer as any).currentVideoTimeSec;
  assert(Math.abs(time60 - 6.0) < 0.001, `Frame 60 syncs to 6.000s (got ${time60.toFixed(3)}s)`);

  // Test at frame 120 (2 seconds later at 60fps)
  extLayer.update(mockRc(120));
  const time120 = (extLayer as any).currentVideoTimeSec;
  assert(Math.abs(time120 - 7.0) < 0.001, `Frame 120 syncs to 7.000s (got ${time120.toFixed(3)}s)`);

  // Test draw without crashing (fallback synthesized screen)
  extLayer.draw(mockRc(60));
  assert(true, 'ExternalVideoLayer draws cleanly with synthesized video fallback');

  console.log('\n=== ALL PHASE 6 TESTS PASSED! ===');
}

runPhase6Tests().catch((err) => {
  console.error(err);
  process.exit(1);
});
