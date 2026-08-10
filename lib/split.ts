import { runFfmpeg } from './media-process.ts';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Splits a video into fixed-duration segments using FFmpeg's segment muxer.
 * Uses stream copy (-c copy) to perform cuts instantly and losslessly.
 */
export async function splitVideo(
  inputPath: string,
  segmentTimeSec: number,
  outputDir: string,
): Promise<string[]> {
  await runFfmpeg([
    '-y',
    '-i', inputPath,
    '-f', 'segment',
    '-segment_time', segmentTimeSec.toString(),
    '-c', 'copy',
    join(outputDir, 'split_segment_%03d.mp4'),
  ]);

  const files = readdirSync(outputDir)
    .filter((f) => f.startsWith('split_segment_') && f.endsWith('.mp4'))
    .sort()
    .map((f) => join(outputDir, f));

  return files;
}
