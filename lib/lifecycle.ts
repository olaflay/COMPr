/**
 * Graceful shutdown coordinator (Twelve-Factor "Disposability", BullMQ
 * "Going to production", Node SIGTERM best practice).
 *
 * On SIGINT/SIGTERM: stop accepting new work, drain in-flight work, close
 * backing connections, then exit 0. A hard deadline force-exits if the drain
 * hangs, and a second signal during shutdown forces an immediate exit.
 *
 * Dependencies (signal registration, exit, logging) are injected so the
 * coordinator is unit-testable without touching the real process. See
 * lib/install-prompt.ts for the same injectable-helper pattern.
 */

export const DEFAULT_DRAIN_TIMEOUT_MS = 30_000;

export interface GracefulShutdownDeps {
  /** Signals to listen for. Defaults to SIGTERM + SIGINT. */
  signals?: NodeJS.Signals[];
  /** Drain work and close connections. Must resolve when the process is safe to exit. */
  onShutdown: (signal: string) => Promise<void>;
  /** Hard deadline for the drain before a forced exit. Default 30s. */
  timeoutMs?: number;
  log?: (message: string) => void;
  /** Process exit function. Defaults to process.exit. */
  exit?: (code: number) => void;
  /** Signal listener registration. Defaults to process.once. */
  on?: (signal: string, handler: (signal: string) => void) => void;
}

export interface ShutdownControl {
  shutdown: (signal?: string) => void;
  isShuttingDown: () => boolean;
}

export function createShutdownCoordinator(deps: GracefulShutdownDeps): ShutdownControl {
  const signals = deps.signals ?? ['SIGTERM', 'SIGINT'];
  const timeoutMs = deps.timeoutMs ?? DEFAULT_DRAIN_TIMEOUT_MS;
  const log = deps.log ?? (() => {});
  const exit = deps.exit ?? ((code: number) => process.exit(code));
  const on = deps.on ?? ((signal, handler) => process.once(signal, () => handler(signal)));

  let shuttingDown = false;
  let forceExitTimer: NodeJS.Timeout | null = null;

  const clearForceExitTimer = (): void => {
    if (forceExitTimer) {
      clearTimeout(forceExitTimer);
      forceExitTimer = null;
    }
  };

  const shutdown = (signal: string = 'SIGTERM'): void => {
    // A second signal while a drain is already running means "stop delaying".
    if (shuttingDown) {
      log(`Received ${signal} during shutdown. Forcing immediate exit.`);
      clearForceExitTimer();
      exit(1);
      return;
    }
    shuttingDown = true;
    log(`Received ${signal}. Starting graceful shutdown (drain timeout: ${timeoutMs}ms).`);

    forceExitTimer = setTimeout(() => {
      log('Drain exceeded timeout. Forcing exit.');
      exit(1);
    }, timeoutMs);

    deps.onShutdown(signal).then(
      () => {
        clearForceExitTimer();
        log('Graceful shutdown complete.');
        exit(0);
      },
      (err: unknown) => {
        clearForceExitTimer();
        const message = err instanceof Error ? err.message : String(err);
        log(`Graceful shutdown failed: ${message}`);
        exit(1);
      },
    );
  };

  for (const signal of signals) {
    on(signal, () => shutdown(signal));
  }

  return { shutdown, isShuttingDown: () => shuttingDown };
}

/**
 * Wire a coordinator into the real process. Intended call sites:
 * server/index.ts and workers/run-all.ts.
 */
export function registerGracefulShutdown(deps: GracefulShutdownDeps): ShutdownControl {
  return createShutdownCoordinator(deps);
}