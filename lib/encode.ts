import { statSync, unlinkSync } from 'node:fs';
import { probe } from './probe.ts';
import { runFfmpeg } from './media-process.ts';

export interface EncodeParams {
  inputPath: string;
  outputPath: string;
  width: number;
  height: number;
  videoBitrateKbps: number;
  audioBitrateKbps: number;
  cpuPreset?: 'slow' | 'medium' | 'fast';
  passCount?: 1 | 2;
  isHdr?: boolean;
  profile?: 'baseline' | 'main' | 'high';
  level?: string;
  enableBframes?: boolean;
}

export interface ImageParams {
  inputPath: string;
  outputPath: string;
  maxLongEdgePx?: number;
}

export interface ImageResult {
  width: number;
  height: number;
  actualSizeMB: number;
  outputPath: string;
}

export function fileSizeMB(p: string): number {
  return statSync(p).size / (1024 * 1024);
}

/**
 * FFmpeg encode with computed parameters and advanced optimizations.
 * Dynamic HDR to SDR tone mapping fallback cascade, GOP alignments,
 * color sanitization, and stereo downmixing are applied.
 * All args passed as an array via execFileSync — no shell strings.
 */
export async function encode({
  inputPath,
  outputPath,
  width,
  height,
  videoBitrateKbps,
  audioBitrateKbps,
  cpuPreset = 'medium',
  passCount = 2,
  isHdr = false,
  profile = 'main',
  level = '3.1',
  enableBframes = false,
}: EncodeParams): Promise<void> {
  // Define video filter graphs.
  // Priority 1: High-fidelity zscale tone mapping.
  // Priority 2: Standard tone mapping.
  // Priority 3: Fallback (standard scale).
  const filterCandidates = isHdr
    ? [
        `zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,scale=${width}:${height}`,
        `tonemap=tonemap=hable,format=yuv420p,scale=${width}:${height}`,
        `scale=${width}:${height}`,
      ]
    : [`scale=${width}:${height}`];

  let lastError: Error | null = null;

  for (const filterGraph of filterCandidates) {
    try {
      if (passCount === 2) {
        const passLogPrefix = outputPath + '.2pass';
        try {
          // Pass 1
          await runFfmpeg([
            '-y',
            '-threads', '0',
            '-i', inputPath,
            '-vf', filterGraph,
            '-c:v', 'libx264',
            '-profile:v', profile,
            '-level', level,
            '-g', '60',
            '-keyint_min', '60',
            '-sc_threshold', '0',
            '-bf', enableBframes ? '3' : '0',
            '-preset', cpuPreset,
            '-b:v', `${Math.round(videoBitrateKbps)}k`,
            '-maxrate', `${Math.round(videoBitrateKbps * 1.1)}k`,
            '-bufsize', `${Math.round(videoBitrateKbps * 2)}k`,
            '-pass', '1',
            '-passlogfile', passLogPrefix,
            '-an',
            '-f', 'null',
            process.platform === 'win32' ? 'NUL' : '/dev/null',
          ], { timeout: 300_000 });

          // Pass 2
          await runFfmpeg([
            '-y',
            '-threads', '0',
            '-i', inputPath,
            '-vf', filterGraph,
            '-c:v', 'libx264',
            '-profile:v', profile,
            '-level', level,
            '-g', '60',
            '-keyint_min', '60',
            '-sc_threshold', '0',
            '-bf', enableBframes ? '3' : '0',
            '-preset', cpuPreset,
            '-b:v', `${Math.round(videoBitrateKbps)}k`,
            '-maxrate', `${Math.round(videoBitrateKbps * 1.1)}k`,
            '-bufsize', `${Math.round(videoBitrateKbps * 2)}k`,
            '-pass', '2',
            '-passlogfile', passLogPrefix,
            '-c:a', 'aac',
            '-ac', '2',
            '-ar', '44100',
            '-b:a', `${audioBitrateKbps}k`,
            '-pix_fmt', 'yuv420p',
            '-color_primaries', 'bt709',
            '-color_trc', 'bt709',
            '-colorspace', 'bt709',
            '-movflags', '+faststart',
            '-loglevel', 'error',
            outputPath,
          ], { timeout: 300_000 });
        } finally {
          // Clean up log files
          try {
            unlinkSync(`${passLogPrefix}-0.log`);
          } catch (e) {}
          try {
            unlinkSync(`${passLogPrefix}-0.log.mbtree`);
          } catch (e) {}
        }
      } else {
        // Single-pass CRF-capped (or standard one-pass)
        const args = [
          '-y',
          '-threads', '0',
          '-i', inputPath,
          '-vf', filterGraph,
          '-c:v', 'libx264',
          '-profile:v', profile,
          '-level', level,
          '-g', '60',
          '-keyint_min', '60',
          '-sc_threshold', '0',
          '-bf', enableBframes ? '3' : '0',
          '-preset', cpuPreset,
        ];

        if (cpuPreset === 'fast') {
          args.push('-crf', '23');
        }

        args.push(
          '-b:v', `${Math.round(videoBitrateKbps)}k`,
          '-maxrate', `${Math.round(videoBitrateKbps * 1.1)}k`,
          '-bufsize', `${Math.round(videoBitrateKbps * 2)}k`,
          '-c:a', 'aac',
          '-ac', '2',
          '-ar', '44100',
          '-b:a', `${audioBitrateKbps}k`,
          '-pix_fmt', 'yuv420p',
          '-color_primaries', 'bt709',
          '-color_trc', 'bt709',
          '-colorspace', 'bt709',
          '-movflags', '+faststart',
          '-loglevel', 'error',
          outputPath,
        );

        await runFfmpeg(args, { timeout: 300_000 });
      }
      // Encode completed successfully using this filter graph.
      return;
    } catch (err: any) {
      lastError = err;
      // Log filter candidate failure and continue to fallback
      console.warn(`[Encode] Filter option failed, trying fallback: ${err.message}`);
    }
  }

  // If all filter graphs fail, throw the last encountered error
  throw lastError || new Error('FFmpeg encoding failed with all filter configurations.');
}

/**
 * Process image for WhatsApp transmission.
 * Scales long edge to maxLongEdgePx, strips EXIF/GPS metadata (-map_metadata -1).
 */
export async function processImage({
  inputPath,
  outputPath,
  maxLongEdgePx = 1080,
}: ImageParams): Promise<ImageResult> {
  await runFfmpeg([
    '-y',
    '-i', inputPath,
    '-vf', `scale='min(${maxLongEdgePx},iw)':'min(${maxLongEdgePx},ih)':force_original_aspect_ratio=decrease`,
    '-map_metadata', '-1',
    '-loglevel', 'error',
    outputPath,
  ], { timeout: 30_000 });

  const outputProbe = await probe(outputPath);
  const actualSizeMB = fileSizeMB(outputPath);

  return {
    width: outputProbe.width,
    height: outputProbe.height,
    actualSizeMB: Math.round(actualSizeMB * 1000) / 1000,
    outputPath,
  };
}
