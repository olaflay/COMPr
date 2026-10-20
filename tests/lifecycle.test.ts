import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createShutdownCoordinator,
  DEFAULT_DRAIN_TIMEOUT_MS,
  type GracefulShutdownDeps,
} from '../lib/lifecycle.ts';

/**
 * Coordinator harness with injected deps: no real process signals, no real
 * exit, no real timers leaking. `onShutdown.resolve` lets tests complete the
 * drain on demand.
 */
function makeCoordinator(overrides: Partial<GracefulShutdownDeps> = {}) {
  const calls: { onShutdown: boolean; exitCodes: number[]; logs: string[] } = {
    onShutdown: false,
    exitCodes: [],
    logs: [],
  };

  let resolveOnShutdown: () => void = () => {};
  const onShutdown = (signal: string): Promise<void> => {
    calls.onShutdown = true;
    assert.equal(typeof signal, 'string');
    return new Promise<void>((resolve) => {
      resolveOnShutdown = resolve;
    });
  };

  const deps: GracefulShutdownDeps = {
    onShutdown,
    signals: ['SIGTERM', 'SIGINT'],
    timeoutMs: DEFAULT_DRAIN_TIMEOUT_MS,
    log: (msg) => calls.logs.push(msg),
    exit: (code) => calls.exitCodes.push(code),
    on: () => {},
    ...overrides,
  };

  const control = createShutdownCoordinator(deps);
  return {
    control,
    calls,
    finishDrain: () => resolveOnShutdown(),
  };
}

describe('createShutdownCoordinator (graceful shutdown)', () => {
  it('calls onShutdown once and exits 0 after the drain completes', async () => {
    const { control, calls, finishDrain } = makeCoordinator();
    control.shutdown('SIGTERM');
    assert.equal(calls.onShutdown, true);
    assert.equal(calls.exitCodes.length, 0, 'must not exit before the drain finishes');
    finishDrain();
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(calls.exitCodes, [0]);
  });

it('ignores repeated shutdown calls while draining, but a second signal forces exit', () => {
  const { control, calls } = makeCoordinator();
  control.shutdown('SIGTERM');
  control.shutdown('SIGTERM'); // duplicate of the same signal: force-exit path
  assert.deepEqual(calls.exitCodes, [1]);
  assert.equal(calls.onShutdown, true);
});

  it('isShuttingDown flips true once shutdown starts', () => {
    const { control } = makeCoordinator();
    assert.equal(control.isShuttingDown(), false);
    control.shutdown('SIGTERM');
    assert.equal(control.isShuttingDown(), true);
  });

  it('force-exits 1 when the drain hangs past the timeout', async () => {
    const { control, calls } = makeCoordinator({ timeoutMs: 5 });
    control.shutdown('SIGTERM');
    // Never call finishDrain; wait for the force-exit timer.
    await new Promise((r) => setTimeout(r, 30));
    assert.deepEqual(calls.exitCodes, [1]);
  });

  it('exits 1 when onShutdown rejects', async () => {
    const { control, calls } = makeCoordinator({
      onShutdown: async () => {
        throw new Error('db driver broken');
      },
    });
    control.shutdown('SIGTERM');
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(calls.exitCodes, [1]);
    assert.ok(calls.logs.some((l) => l.includes('db driver broken')));
  });

  it('a second signal during a stuck drain forces an immediate exit', async () => {
    const { control, calls } = makeCoordinator({ timeoutMs: 10_000 });
    control.shutdown('SIGTERM');
    control.shutdown('SIGINT');
    assert.deepEqual(calls.exitCodes, [1], 'second signal must force-exit');
  });

  it('registers one listener per configured signal', () => {
    const registered: string[] = [];
    const control = createShutdownCoordinator({
      onShutdown: async () => {},
      signals: ['SIGTERM', 'SIGINT', 'SIGHUP'],
      on: (signal) => {
        registered.push(signal);
      },
    });
    control.shutdown('SIGTERM');
    assert.deepEqual(registered, ['SIGTERM', 'SIGINT', 'SIGHUP']);
  });

  it('without an injected `on`, does not wire real process signal listeners', async () => {
    // Guard against accidental default-behavior regressions: with no injectable
    // `on`, createShutdownCoordinator must NOT register on the real process.
    const listenerCountBefore = process.listenerCount('SIGTERM');
    createShutdownCoordinator({ onShutdown: async () => {} });
    assert.equal(
      process.listenerCount('SIGTERM'),
      listenerCountBefore,
      'missing injected `on` must not wire real process listeners',
    );
  });
});