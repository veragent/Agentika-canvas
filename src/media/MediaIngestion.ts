/**
 * agentika-canvas: Media Ingestion & Multi-Format Demuxing Engine
 * Synchronously feeds external video/audio assets into the canvas scene graph:
 * - High-level precision sampling via Mediabunny VideoSampleSink
 * - Multi-format demuxing (.mkv, .flv, .avi, .ts, .mov, .webm) via web-demuxer WASM
 */

import { Input, UrlSource, BlobSource, VideoSampleSink, VideoSample, ALL_FORMATS } from 'mediabunny';
import { WebDemuxer } from 'web-demuxer';

export interface VideoMetadata {
  durationSeconds: number;
  width: number;
  height: number;
  framerate?: number;
  codec?: string;
}

/**
 * 1. Precision Video Reader using Mediabunny
 * Delivers exact-frame retrieval via WebCodecs VideoSampleSink
 */
export class PreciseVideoReader {
  private input: Input | null = null;
  private sink: VideoSampleSink | null = null;
  private metadata: VideoMetadata | null = null;
  private sampleCache: Map<number, VideoSample> = new Map();
  private maxCacheSize = 30;

  /**
   * Load video from URL or Blob
   */
  public async load(source: string | Blob): Promise<VideoMetadata> {
    const mediaSource = typeof source === 'string' ? new UrlSource(source) : new BlobSource(source);
    this.input = new Input({ source: mediaSource, formats: ALL_FORMATS });

    // Find primary video track
    const videoTracks = await this.input.getVideoTracks();
    if (videoTracks.length === 0) {
      throw new Error('[PreciseVideoReader] No video track found in input media.');
    }

    const primaryTrack = videoTracks[0];
    this.sink = new VideoSampleSink(primaryTrack);

    const duration = await this.input.computeDuration();
    this.metadata = {
      durationSeconds: duration,
      width: primaryTrack.displayWidth ?? 1920,
      height: primaryTrack.displayHeight ?? 1080,
    };

    return this.metadata;
  }

  /**
   * Fetch sample at target timestamp (in seconds)
   */
  public async getSampleAt(timestampSec: number): Promise<VideoSample | null> {
    if (!this.sink) return null;

    // Quantize timestamp to ~60fps grid for caching (1/60 ~ 0.016s)
    const cacheKey = Math.round(timestampSec * 60);
    if (this.sampleCache.has(cacheKey)) {
      return this.sampleCache.get(cacheKey) || null;
    }

    try {
      const sample = await this.sink.getSample(timestampSec);
      if (sample) {
        if (this.sampleCache.size >= this.maxCacheSize) {
          const firstKey = this.sampleCache.keys().next().value;
          if (firstKey !== undefined) {
            const oldSample = this.sampleCache.get(firstKey);
            oldSample?.close();
            this.sampleCache.delete(firstKey);
          }
        }
        this.sampleCache.set(cacheKey, sample);
      }
      return sample;
    } catch (err) {
      console.warn(`[PreciseVideoReader] Failed to retrieve sample at ${timestampSec}s:`, err);
      return null;
    }
  }

  public getMetadata(): VideoMetadata | null {
    return this.metadata;
  }

  public close(): void {
    for (const sample of this.sampleCache.values()) {
      sample.close();
    }
    this.sampleCache.clear();
    this.sink = null;
    this.input = null;
  }
}

/**
 * 2. Multi-Format WebDemuxer Reader using WASM
 * Supports MKV, FLV, AVI, TS, MOV, WebM, MP4
 */
export class MultiFormatDemuxerReader {
  private demuxer: WebDemuxer | null = null;
  private videoDecoder: VideoDecoder | null = null;
  private currentFrame: VideoFrame | null = null;
  private wasmPath: string;

  constructor(wasmPath = '/wasm-files/web-demuxer.wasm') {
    this.wasmPath = wasmPath;
  }

  public async load(source: File | Blob | string): Promise<void> {
    this.demuxer = new WebDemuxer({
      wasmFilePath: this.wasmPath,
    });

    const fileSource = source instanceof Blob && !(source instanceof File)
      ? new File([source], 'video.mp4', { type: source.type })
      : source;

    await this.demuxer.load(fileSource as File | string);

    // Get WebCodecs decoder configuration
    const stream = await this.demuxer.getMediaStream('video');
    const config = this.demuxer.genDecoderConfig('video', stream);

    if (typeof VideoDecoder !== 'undefined') {
      this.videoDecoder = new VideoDecoder({
        output: (frame: VideoFrame) => {
          if (this.currentFrame) {
            this.currentFrame.close();
          }
          this.currentFrame = frame;
        },
        error: (err) => {
          console.error('[MultiFormatDemuxerReader] VideoDecoder error:', err);
        },
      });

      this.videoDecoder.configure(config);
    }
  }

  /**
   * Seek and decode chunk at target timestamp
   */
  public async seekAndDecode(timestampSec: number): Promise<VideoFrame | null> {
    if (!this.demuxer || !this.videoDecoder) return null;

    try {
      const packet = await this.demuxer.seekMediaPacket('video', timestampSec);
      if (packet) {
        const chunk = this.demuxer.genEncodedChunk('video', packet);
        this.videoDecoder.decode(chunk);
        await this.videoDecoder.flush();
        return this.currentFrame;
      }
    } catch (err) {
      console.warn(`[MultiFormatDemuxerReader] Seek error at ${timestampSec}s:`, err);
    }

    return null;
  }

  public close(): void {
    if (this.currentFrame) {
      this.currentFrame.close();
      this.currentFrame = null;
    }
    if (this.videoDecoder) {
      this.videoDecoder.close();
      this.videoDecoder = null;
    }
    if (this.demuxer) {
      this.demuxer.destroy();
      this.demuxer = null;
    }
  }
}
