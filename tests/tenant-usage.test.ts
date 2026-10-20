import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getBillingMonth } from '../lib/tenant-usage.ts';

describe('Vecteus Tenant Usage Accounting', () => {
  it('formats the billing month as YYYY-MM correctly', () => {
    const fixedDate = new Date('2026-10-18T12:00:00Z');
    assert.equal(getBillingMonth(fixedDate), '2026-10');
  });
});
