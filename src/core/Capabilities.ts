/**
 * agentika-canvas: WebCodecs Capabilities & Codec Support Validator
 * Validates in-browser hardware acceleration and codec compatibility.
 */

export interface CodecSupportResult {
  codec: string;
  type: 'video' | 'audio';
  supported: boolean;
  hardwareAcceleration?: HardwareAcceleration;
  error?: string;
  config?: VideoEncoderConfig | AudioEncoderConfig;
}

export interface WebCodecsCapabilities {
  hasWebCodecs: boolean;
  hasVideoEncoder: boolean;
  hasVideoDecoder: boolean;
  hasAudioEncoder: boolean;
  hasAudioDecoder: boolean;
  hasVideoFrame: boolean;
  codecs: Record<string, CodecSupportResult>;
  recommendedVideoCodec: string;
  recommendedAudioCodec: string;
  summary: string;
}

export const TARGET_VIDEO_CODECS = [
  { codec: 'avc1.4d0034', label: 'H.264 (AVC) Main Profile L3.4' },
  { codec: 'avc1.640032', label: 'H.264 (AVC) High Profile L3.2' },
  { codec: 'vp09.00.40.08.00', label: 'VP9 Profile 0 L4' },
  { codec: 'av01.0.04M.08', label: 'AV1 Main Profile L4' },
] as const;

export const TARGET_AUDIO_CODECS = [
  { codec: 'mp4a.40.2', label: 'AAC-LC (Stereo MP4)' },
  { codec: 'opus', label: 'Opus (Low-latency WebM/MP4)' },
] as const;

/**
 * Check whether WebCodecs API is present and query hardware acceleration
 * for video and audio codecs.
 */
export async function checkWebCodecsSupport(
  testWidth = 1920,
  testHeight = 1080,
  testBitrate = 5_000_000
): Promise<WebCodecsCapabilities> {
  const isBrowser = typeof window !== 'undefined';
  const hasVideoEncoder = isBrowser && typeof (window as unknown as { VideoEncoder?: unknown }).VideoEncoder !== 'undefined';
  const hasVideoDecoder = isBrowser && typeof (window as unknown as { VideoDecoder?: unknown }).VideoDecoder !== 'undefined';
  const hasAudioEncoder = isBrowser && typeof (window as unknown as { AudioEncoder?: unknown }).AudioEncoder !== 'undefined';
  const hasAudioDecoder = isBrowser && typeof (window as unknown as { AudioDecoder?: unknown }).AudioDecoder !== 'undefined';
  const hasVideoFrame = isBrowser && typeof (window as unknown as { VideoFrame?: unknown }).VideoFrame !== 'undefined';

  const hasWebCodecs = hasVideoEncoder && hasVideoDecoder && hasVideoFrame;
  const codecResults: Record<string, CodecSupportResult> = {};

  let recommendedVideoCodec = 'avc1.4d0034';
  let recommendedAudioCodec = 'mp4a.40.2';
  let hasFoundH264 = false;

  // Check Video Codecs
  if (hasVideoEncoder) {
    for (const item of TARGET_VIDEO_CODECS) {
      const config: VideoEncoderConfig = {
        codec: item.codec,
        width: testWidth,
        height: testHeight,
        bitrate: testBitrate,
        framerate: 60,
        hardwareAcceleration: 'prefer-hardware',
      };

      try {
        const support = await VideoEncoder.isConfigSupported(config);
        codecResults[item.codec] = {
          codec: item.codec,
          type: 'video',
          supported: support.supported ?? false,
          hardwareAcceleration: support.config?.hardwareAcceleration,
          config: support.config,
        };

        if (support.supported && item.codec.startsWith('avc1') && !hasFoundH264) {
          recommendedVideoCodec = item.codec;
          hasFoundH264 = true;
        }
      } catch (err) {
        codecResults[item.codec] = {
          codec: item.codec,
          type: 'video',
          supported: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
  }

  // Check Audio Codecs
  if (hasAudioEncoder) {
    for (const item of TARGET_AUDIO_CODECS) {
      const config: AudioEncoderConfig = {
        codec: item.codec,
        sampleRate: 48000,
        numberOfChannels: 2,
        bitrate: 192000,
      };

      try {
        const support = await AudioEncoder.isConfigSupported(config);
        codecResults[item.codec] = {
          codec: item.codec,
          type: 'audio',
          supported: support.supported ?? false,
          config: support.config,
        };

        if (support.supported && item.codec === 'mp4a.40.2') {
          recommendedAudioCodec = item.codec;
        }
      } catch (err) {
        codecResults[item.codec] = {
          codec: item.codec,
          type: 'audio',
          supported: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
  }

  const summary = hasWebCodecs
    ? `WebCodecs fully active. Primary video codec: ${recommendedVideoCodec}, Audio: ${recommendedAudioCodec}.`
    : 'WebCodecs not supported in this runtime environment (needs modern Chromium/Edge/Firefox/Safari).';

  return {
    hasWebCodecs,
    hasVideoEncoder,
    hasVideoDecoder,
    hasAudioEncoder,
    hasAudioDecoder,
    hasVideoFrame,
    codecs: codecResults,
    recommendedVideoCodec,
    recommendedAudioCodec,
    summary,
  };
}
