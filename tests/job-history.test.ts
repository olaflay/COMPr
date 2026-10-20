import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  addToHistory,
  getHistory,
  clearHistory,
  removeFromHistory,
  type HistoryEntry,
} from '../lib/job-history.ts';

// Mock localStorage in global scope for testing
class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

describe('lib/job-history.ts - Processing History Tracking', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = new MockLocalStorage();
  });

  const sampleEntry: HistoryEntry = {
    jobId: 'job_123',
    fileName: 'test-video.mp4',
    fileType: 'video/mp4',
    preset: 'STATUS',
    inputSizeBytes: 20000000,
    outputSizeBytes: 5000000,
    downloadPath: '/api/v1/jobs/job_123/download/out_1',
    createdAt: Date.now(),
    status: 'DONE',
  };

  it('adds an entry and retrieves it newest first', () => {
    addToHistory(sampleEntry);
    const history = getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].jobId, 'job_123');
    assert.equal(history[0].status, 'DONE');
  });

  it('deduplicates entries with the same jobId', () => {
    addToHistory(sampleEntry);
    addToHistory({ ...sampleEntry, outputSizeBytes: 4500000 });
    const history = getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].outputSizeBytes, 4500000);
  });

  it('removes a specific entry by jobId', () => {
    addToHistory(sampleEntry);
    addToHistory({ ...sampleEntry, jobId: 'job_456' });
    assert.equal(getHistory().length, 2);

    removeFromHistory('job_123');
    const updated = getHistory();
    assert.equal(updated.length, 1);
    assert.equal(updated[0].jobId, 'job_456');
  });

  it('clears all history entries', () => {
    addToHistory(sampleEntry);
    clearHistory();
    assert.equal(getHistory().length, 0);
  });
});
