import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { probe } from '../lib/probe.ts';
import { setProcessRunner, resetProcessRunner } from '../lib/media-process.ts';

describe('probe.ts - media metadata and color space probing', () => {
  it('correctly parses SDR format information', async () => {
    const ffprobeMock = mock.fn(async (_command: string) => JSON.stringify({
      streams: [
        {
          codec_type: 'video',
          codec_name: 'h264',
          width: 1920,
          height: 1080,
          duration: '10.500000',
          color_space: 'bt709',
          color_transfer: 'bt709',
          color_primaries: 'bt709'
        }
      ]
    }));
    setProcessRunner(ffprobeMock);

    try {
      const result = await probe('sdr_video.mp4');
      assert.equal(result.width, 1920);
      assert.equal(result.height, 1080);
      assert.equal(result.durationSec, 10.5);
      assert.equal(result.isHdr, false);
      assert.equal(result.colorSpace, 'bt709');
      assert.equal(result.colorTransfer, 'bt709');
      assert.equal(result.colorPrimaries, 'bt709');
      assert.equal(ffprobeMock.mock.calls[0].arguments[0], 'ffprobe');
    } finally {
      resetProcessRunner();
    }
  });

  it('correctly detects HDR10 (smpte2084 / bt2020) transfer function', async () => {
    const ffprobeMock = mock.fn(async (_command: string) => JSON.stringify({
      streams: [
        {
          codec_type: 'video',
          codec_name: 'hevc',
          width: 3840,
          height: 2160,
          duration: '5.000000',
          color_space: 'bt2020nc',
          color_transfer: 'smpte2084',
          color_primaries: 'bt2020'
        }
      ]
    }));
    setProcessRunner(ffprobeMock);

    try {
      const result = await probe('hdr_video.mp4');
      assert.equal(result.width, 3840);
      assert.equal(result.height, 2160);
      assert.equal(result.isHdr, true);
      assert.equal(result.colorTransfer, 'smpte2084');
    } finally {
      resetProcessRunner();
    }
  });

  it('correctly detects HLG (arib-std-b67) transfer function', async () => {
    const ffprobeMock = mock.fn(async (_command: string) => JSON.stringify({
      streams: [
        {
          codec_type: 'video',
          codec_name: 'hevc',
          width: 1920,
          height: 1080,
          duration: '8.000000',
          color_space: 'bt2020nc',
          color_transfer: 'arib-std-b67',
          color_primaries: 'bt2020'
        }
      ]
    }));
    setProcessRunner(ffprobeMock);

    try {
      const result = await probe('hlg_video.mp4');
      assert.equal(result.isHdr, true);
      assert.equal(result.colorTransfer, 'arib-std-b67');
    } finally {
      resetProcessRunner();
    }
  });
});
