import { describe, it, expect } from 'vitest';
import { getBankFloor, getBankFloorAccounts, getBankFloorStatus } from './floor.js';

const acc = (over) => ({
  id: Math.random().toString(36).slice(2),
  name: 'A',
  type: 'bank',
  balance: 0,
  currency: 'PHP',
  ownerId: 'u1',
  archivedAt: null,
  countsTowardFloor: false,
  ...over,
});

describe('getBankFloor', () => {
  it('sums only tagged PHP bank accounts', () => {
    const accounts = [
      acc({ balance: 100, countsTowardFloor: true }),
      acc({ balance: 50, countsTowardFloor: true }),
      acc({ balance: 999 }), // untagged
    ];
    expect(getBankFloor(accounts)).toBe(150);
  });

  it('ignores non-bank types even if tagged', () => {
    for (const type of ['cash', 'ewallet', 'cooperative', 'receivable']) {
      expect(getBankFloor([acc({ type, balance: 500, countsTowardFloor: true })]), type).toBe(0);
    }
  });

  it('ignores USD accounts — the floor is a peso target', () => {
    expect(getBankFloor([acc({ currency: 'USD', balance: 500, countsTowardFloor: true })])).toBe(0);
  });

  it('ignores archived accounts', () => {
    expect(
      getBankFloor([acc({ balance: 500, countsTowardFloor: true, archivedAt: '2026-09-01T00:00:00Z' })])
    ).toBe(0);
  });

  it('treats a missing flag (rows predating the column) as not counting', () => {
    const legacy = { id: 'x', name: 'Legacy', type: 'bank', balance: 700, currency: 'PHP', ownerId: 'u1' };
    expect(getBankFloor([legacy])).toBe(0);
  });

  it('counts either household member’s accounts — the floor is shared', () => {
    const accounts = [
      acc({ ownerId: 'daddy', balance: 100, countsTowardFloor: true }),
      acc({ ownerId: 'mommy', balance: 200, countsTowardFloor: true }),
    ];
    expect(getBankFloor(accounts)).toBe(300);
    expect(getBankFloorAccounts(accounts)).toHaveLength(2);
  });

  it('is zero when nothing is tagged, not a crash', () => {
    expect(getBankFloor([])).toBe(0);
    expect(getBankFloor([acc({ balance: 100 })])).toBe(0);
  });
});

describe('getBankFloorStatus', () => {
  const accounts = [acc({ balance: 800, countsTowardFloor: true })];

  it('reports the gap against a target', () => {
    expect(getBankFloorStatus(accounts, 1000)).toEqual({ current: 800, target: 1000, gap: -200, isMet: false });
    expect(getBankFloorStatus(accounts, 500)).toEqual({ current: 800, target: 500, gap: 300, isMet: true });
  });

  it('reports nothing rather than a misleading zero when no target is set', () => {
    expect(getBankFloorStatus(accounts, null)).toEqual({ current: 800, target: null, gap: null, isMet: null });
    expect(getBankFloorStatus(accounts, undefined).isMet).toBeNull();
    expect(getBankFloorStatus(accounts, 0).isMet).toBeNull();
  });

  it('treats exactly meeting the target as met', () => {
    expect(getBankFloorStatus(accounts, 800).isMet).toBe(true);
  });
});
