/**
 * Tests for lib/policy-engine.ts — scene score to encoding plan mapping.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { bitrateToCRF, selectProfile, buildFFmpegArgs } from '../lib/policy-engine.ts';
import type { SceneAnalysis } from '../lib/analysis.ts';

// Minimal scene analysis for testing
function makeAnalysis(overrides: Partial<SceneAnalysis> = {}): SceneAnalysis {
  return {
    frames: [],
    avgFaceScore: 0,
    avgTextEdgeScore: 0,
    avgMotionScore: 0,
    hasFaces: false,
    hasText: false,
    isHighMotion: false,
    isLowLight: false,
    durationSec: 30,
    totalFramesSampled: 30,
    ...overrides,
  };
}

describe('bitrateToCRF', () => {
  it('maps high bitrate to low CRF', () => {
    const crf = bitrateToCRF(5000);
    assert.ok(crf <= 22, `Expected CRF <= 22 for 5000kbps, got ${crf}`);
  });

  it('maps medium bitrate to mid CRF', () => {
    const crf = bitrateToCRF(1300);
    assert.ok(crf >= 26 && crf <= 30, `Expected CRF 26-30 for 1300kbps, got ${crf}`);
  });

  it('maps low bitrate to high CRF', () => {
    const crf = bitrateToCRF(200);
    assert.ok(crf >= 36, `Expected CRF >= 36 for 200kbps, got ${crf}`);
  });
});

describe('selectProfile', () => {
  it('selects face-boost profile for face-heavy content in document mode', () => {
    const analysis = makeAnalysis({
      avgFaceScore: 0.2,
      hasFaces: true,
      avgMotionScore: 0.3,
    });

    const plan = selectProfile(analysis, 16, 30, 'WHATSAPP_DOCUMENT');
    assert.equal(plan.codec, 'libsvtav1', 'should use AV1 for face content in document mode');
    assert.ok(plan.crf <= 28, `CRF should be reduced for faces, got ${plan.crf}`);
    assert.ok(plan.reason.includes('face boost'), 'reason should mention face boost');
  });

  it('selects text-detail profile for text-heavy content in document mode', () => {
    const analysis = makeAnalysis({
      avgTextEdgeScore: 0.4,
      hasText: true,
      avgMotionScore: 0.2,
    });

    const plan = selectProfile(analysis, 16, 30, 'WHATSAPP_DOCUMENT');
    assert.equal(plan.codec, 'libsvtav1', 'should use AV1 for text content in document mode');
    assert.ok(plan.reason.includes('text sharpness'), 'reason should mention text');
  });

  it('selects high-motion profile for fast-moving content in document mode', () => {
    const analysis = makeAnalysis({
      avgMotionScore: 0.7,
      isHighMotion: true,
    });

    const plan = selectProfile(analysis, 16, 30, 'WHATSAPP_DOCUMENT');
    assert.equal(plan.codec, 'libsvtav1', 'should use AV1 for high motion');
    assert.ok(plan.reason.includes('high motion'), 'reason should mention motion');
    // High motion adds +2 to base CRF — verify the adjustment is applied
    const planBaseline = selectProfile(makeAnalysis(), 16, 30, 'WHATSAPP_DOCUMENT');
    assert.ok(plan.crf > planBaseline.crf,
      `Motion CRF (${plan.crf}) should be higher than baseline (${planBaseline.crf})`);
  });

  it('uses balanced profile for neutral content in document mode', () => {
    const analysis = makeAnalysis({
      avgFaceScore: 0.02,
      avgTextEdgeScore: 0.1,
      avgMotionScore: 0.3,
    });

    const plan = selectProfile(analysis, 16, 30, 'WHATSAPP_DOCUMENT');
    assert.equal(plan.codec, 'libsvtav1', 'should use AV1 for balanced');
    assert.ok(plan.crf >= 20 && plan.crf <= 40, `CRF should be in valid range, got ${plan.crf}`);
  });

  it('selects H.264 Main for standard WhatsApp normal mode', () => {
    const analysis = makeAnalysis();
    const plan = selectProfile(analysis, 16, 30, 'WHATSAPP_NORMAL');
    assert.equal(plan.codec, 'libx264', 'should select H.264 for normal WhatsApp uploads');
    assert.ok(plan.profileName.startsWith('whatsapp_normal_'), 'should select a whatsapp_normal profile');
    assert.ok(plan.extraFlags.includes('-bf'), 'should specify B-frames setting');
    assert.ok(plan.extraFlags.includes('0'), 'should have B-frames set to 0');
    assert.ok(plan.extraFlags.includes('-profile:v'), 'should specify profile');
    assert.ok(plan.extraFlags.includes('main'), 'should use main profile');
  });

  it('selects H.264 High for WhatsApp HD mode', () => {
    const analysis = makeAnalysis();
    const plan = selectProfile(analysis, 16, 30, 'WHATSAPP_HD');
    assert.equal(plan.codec, 'libx264', 'should select H.264 for HD WhatsApp uploads');
    assert.ok(plan.profileName.startsWith('whatsapp_hd_'), 'should select a whatsapp_hd profile');
    assert.ok(plan.extraFlags.includes('-bf'), 'should specify B-frames setting');
    assert.ok(plan.extraFlags.includes('2'), 'should have B-frames set to 2');
    assert.ok(plan.extraFlags.includes('-profile:v'), 'should specify profile');
    assert.ok(plan.extraFlags.includes('high'), 'should use high profile');
  });

  it('applies face boost reducing CRF by up to 4 in normal mode', () => {
    const analysis = makeAnalysis({
      avgFaceScore: 0.3,
      hasFaces: true,
    });

    const planBaseline = selectProfile(makeAnalysis(), 16, 30, 'WHATSAPP_NORMAL');
    const planFaces = selectProfile(analysis, 16, 30, 'WHATSAPP_NORMAL');

    assert.ok(planFaces.crf < planBaseline.crf,
      `Face CRF (${planFaces.crf}) should be lower than baseline (${planBaseline.crf})`);
  });
});

describe('buildFFmpegArgs', () => {
  it('produces valid SVT-AV1 argument array', () => {
    const plan = {
      profileName: 'av1_balanced',
      codec: 'libsvtav1',
      crf: 28,
      speedPreset: '6',
      videoBitrateMax: null,
      audioCodec: 'aac',
      audioBitrate: 96,
      pixelFormat: 'yuv420p',
      extraFlags: ['-svtav1-params', 'tune=0:sharpness=1'],
      reason: 'test',
    };

    const args = buildFFmpegArgs('/input.mp4', '/output.mp4', plan);

    assert.ok(args.includes('-c:v'), 'should have video codec flag');
    assert.ok(args.includes('libsvtav1'), 'should specify SVT-AV1 codec');
    assert.ok(args.includes('-crf'), 'should have CRF flag');
    assert.ok(args.includes('28'), 'should have CRF value');
    assert.ok(args.includes('-pix_fmt'), 'should have pixel format');
    assert.ok(args.includes('yuv420p'), 'should specify yuv420p');
    assert.ok(args.includes('-movflags'), 'should have movflags');
    assert.ok(args.includes('+faststart'), 'should enable faststart');
    assert.ok(args.includes('/output.mp4'), 'should have output path');
  });

  it('includes bitrate cap when specified', () => {
    const plan = {
      profileName: 'test',
      codec: 'libsvtav1',
      crf: 28,
      speedPreset: '6',
      videoBitrateMax: 1500,
      audioCodec: 'aac',
      audioBitrate: 96,
      pixelFormat: 'yuv420p',
      extraFlags: [],
      reason: 'test',
    };

    const args = buildFFmpegArgs('/input.mp4', '/output.mp4', plan);
    assert.ok(args.includes('-maxrate'), 'should have maxrate flag');
    assert.ok(args.includes('1500k'), 'should have bitrate value');
    assert.ok(args.includes('-bufsize'), 'should have bufsize');
  });

  it('never uses shell strings — all args are array elements', () => {
    const plan = {
      profileName: 'test',
      codec: 'libsvtav1',
      crf: 28,
      speedPreset: '6',
      videoBitrateMax: null,
      audioCodec: 'aac',
      audioBitrate: 96,
      pixelFormat: 'yuv420p',
      extraFlags: [],
      reason: 'test',
    };

    const args = buildFFmpegArgs('/input.mp4', '/output.mp4', plan);
    // Every arg should be a string, not containing shell metacharacters
    for (const arg of args) {
      assert.equal(typeof arg, 'string', 'every arg should be a string');
      assert.ok(!arg.includes(';'), `arg should not contain semicolon: ${arg}`);
      assert.ok(!arg.includes('|'), `arg should not contain pipe: ${arg}`);
      assert.ok(!arg.includes('`'), `arg should not contain backtick: ${arg}`);
    }
  });
});
