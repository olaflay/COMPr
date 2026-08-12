import { runFfprobe } from './media-process.ts';

export interface ProbeResult {
  width: number;
  height: number;
  durationSec: number;
  mediaKind: 'VIDEO' | 'IMAGE';
  codecName?: string;
  hasAudio?: boolean;
  isHdr?: boolean;
  colorSpace?: string;
  colorTransfer?: string;
  colorPrimaries?: string;
  /**
   * Frame count, when ffprobe reports it (e.g. GIF). Used to distinguish a
   * static (single-frame) GIF from an animated one — GIF duration is derived
   * from frame count x per-frame delay, not a video `duration` field the way
   * MP4 reports it, so a single-frame GIF can still carry a non-zero
   * `format.duration` and must not be mistaken for animated on that basis alone.
   */
  frameCount?: number;
}

/**
 * ffprobe extracts duration, resolution, frame rate, codec,
 * container, audio stream info, and HDR color spaces.
 * All args passed as an array — no shell strings.
 */
export async function probe(inputPath: string): Promise<ProbeResult> {
  const out = await runFfprobe([
    '-v', 'error',
    '-show_entries', 'stream=width,height,codec_name,codec_type,duration,nb_frames,rotation,color_space,color_transfer,color_primaries:stream_side_data=rotation:stream_tags=rotate',
    '-show_entries', 'format=duration',
    '-of', 'json',
    inputPath,
  ], { timeout: 15_000 });
  const json = JSON.parse(out);
  const streams = json.streams || [];
  const vStream = streams.find((s: any) => s.codec_type === 'video') || streams[0];

  if (!vStream) {
    throw new Error(`No media stream found in ${inputPath}`);
  }

  const rawWidth = vStream.width || 0;
  const rawHeight = vStream.height || 0;

  // Extract rotation matrix side-data or tags to get effective display orientation
  let rotation = 0;
  if (vStream.side_data_list) {
    const rotSide = vStream.side_data_list.find((sd: any) => typeof sd.rotation === 'number');
    if (rotSide) rotation = rotSide.rotation;
  }
  if (!rotation && vStream.tags?.rotate) {
    rotation = parseInt(vStream.tags.rotate, 10);
  }

  const isRotated90 = Math.abs(rotation) === 90 || Math.abs(rotation) === 270;
  const width = isRotated90 ? rawHeight : rawWidth;
  const height = isRotated90 ? rawWidth : rawHeight;

  const codecName = vStream.codec_name || '';
  const aStream = streams.find((s: any) => s.codec_type === 'audio');

  // GIF's frame count (not its `duration` field) is what tells a static
  // single-frame GIF apart from an animated one — a 1-frame GIF can still
  // carry a non-zero duration (e.g. one long-held frame), so duration alone
  // would misclassify it as animated/VIDEO.
  const frameCount = vStream.nb_frames ? parseInt(vStream.nb_frames, 10) : undefined;
  const isStaticGif = codecName === 'gif' && (frameCount === undefined || frameCount <= 1);

  const isImageCodec = ['mjpeg', 'png', 'webp', 'heic', 'tiff'].includes(codecName) || isStaticGif;
  const formatDuration = json.format?.duration ? parseFloat(json.format.duration) : 0;
  const streamDuration = vStream.duration ? parseFloat(vStream.duration) : 0;
  const rawDuration = formatDuration || streamDuration || 0;

  const mediaKind: 'VIDEO' | 'IMAGE' = isImageCodec || rawDuration < 0.1 ? 'IMAGE' : 'VIDEO';
  const durationSec = mediaKind === 'IMAGE' ? 0 : rawDuration;

  // HDR detection
  const colorSpace = vStream.color_space || '';
  const colorTransfer = vStream.color_transfer || '';
  const colorPrimaries = vStream.color_primaries || '';
  const isHdr = ['smpte2084', 'arib-std-b67'].includes(colorTransfer) || colorSpace.includes('bt2020');

  return {
    width,
    height,
    durationSec,
    mediaKind,
    codecName,
    hasAudio: !!aStream,
    isHdr,
    colorSpace,
    colorTransfer,
    colorPrimaries,
    frameCount,
  };
}
