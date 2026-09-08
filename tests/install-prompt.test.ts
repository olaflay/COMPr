import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DISMISS_KEY,
  REPROMPT_AFTER_DAYS,
  isIOSDevice,
  shouldShowAgain,
  rememberDismissed,
  type InstallPromptStore,
} from '../lib/install-prompt.ts';

class MemStorage {
  map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

function makeStore(now = 1_000_000): { store: InstallPromptStore; storage: MemStorage; tick: (ms: number) => void } {
  const storage = new MemStorage();
  let current = now;
  const store: InstallPromptStore = { storage, now: () => current };
  return {
    store,
    storage,
    tick: (ms) => {
      current += ms;
    },
  };
}

describe('install-prompt retry/dismiss logic', () => {
  let env: ReturnType<typeof makeStore>;
  beforeEach(() => {
    env = makeStore();
  });

  it('shows when nothing has been dismissed yet', () => {
    assert.equal(shouldShowAgain(env.store), true);
  });

  it('shows again once the quiet period has elapsed', () => {
    rememberDismissed(env.store);
    assert.equal(shouldShowAgain(env.store), false);
    env.tick(REPROMPT_AFTER_DAYS * 24 * 60 * 60 * 1000 + 1);
    assert.equal(shouldShowAgain(env.store), true);
  });

  it('hides during the quiet period after a dismissal', () => {
    rememberDismissed(env.store);
    env.tick(24 * 60 * 60 * 1000); // 1 day later
    assert.equal(shouldShowAgain(env.store), false);
  });

  it('persists the dismissal timestamp for the session', () => {
    rememberDismissed(env.store);
    assert.ok(env.storage.getItem(DISMISS_KEY));
  });

  it('treats a corrupt stored value as "show again"', () => {
    env.storage.setItem(DISMISS_KEY, 'not-a-number');
    assert.equal(shouldShowAgain(env.store), true);
  });
});

describe('isIOSDevice (PWA-1 iOS install path)', () => {
  it('detects iPhone Safari that is not installed', () => {
    assert.equal(
      isIOSDevice(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        false
      ),
      true
    );
  });

  it('detects iPad Safari', () => {
    assert.equal(
      isIOSDevice(
        'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        false
      ),
      true
    );
  });

  it('returns false once the PWA is already installed (standalone)', () => {
    assert.equal(
      isIOSDevice(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        true
      ),
      false
    );
  });

  it('returns false for Android / desktop browsers', () => {
    assert.equal(
      isIOSDevice(
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36',
        false
      ),
      false
    );
    assert.equal(
      isIOSDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36', false),
      false
    );
  });
});