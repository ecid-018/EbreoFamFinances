import { describe, it, expect } from 'vitest';
import {
  getLineItems,
  hasItems,
  getItemsTotal,
  routeLineItems,
  getLineItemDiffs,
  getItemSourceAccounts,
  getItemisedOutflow,
} from './splitItems.js';

// Every figure invented. Two accounts, because the whole point of items is a
// line paid from more than one.
const A = 'acc-a';
const B = 'acc-b';
const HUB = 'acc-hub';
const goals = [
  { id: 'g1', name: 'Baby fund', heldInAccountId: 'acc-pafc' },
  { id: 'g2', name: 'Emergency A', heldInAccountId: 'acc-maya' },
];
const item = (over = {}) => ({
  id: 'i1', lineKey: 'splitGoals', label: 'Item', amount: 100,
  fromAccountId: A, toAccountId: null, goalId: null, sortOrder: 0, ...over,
});

describe('getLineItems', () => {
  const items = [
    item({ id: 'b', label: 'Second', sortOrder: 2 }),
    item({ id: 'a', label: 'First', sortOrder: 1 }),
    item({ id: 'c', label: 'Elsewhere', lineKey: 'splitTrading' }),
  ];

  it('returns one line, in sort order', () => {
    expect(getLineItems(items, 'splitGoals').map((i) => i.label)).toEqual(['First', 'Second']);
  });

  it('knows which lines are itemised', () => {
    expect(hasItems(items, 'splitGoals')).toBe(true);
    expect(hasItems(items, 'splitInsurance')).toBe(false);
    expect(hasItems([], 'splitGoals')).toBe(false);
  });

  it('totals a line', () => {
    expect(getItemsTotal(items, 'splitGoals')).toBe(200);
    expect(getItemsTotal(items, 'splitInsurance')).toBe(0);
  });
});

describe('routeLineItems', () => {
  it('sends an item to its goal, landing in that goal’s account', () => {
    const got = routeLineItems([item({ goalId: 'g1', amount: 50 })], 'splitGoals', { goals });
    expect(got[0]).toMatchObject({
      goalId: 'g1', goalName: 'Baby fund', amount: 50,
      accountId: 'acc-pafc', sourceAccountId: A, missingTarget: false,
    });
  });

  it('sends an item to a plain account', () => {
    const got = routeLineItems([item({ toAccountId: B })], 'splitGoals', { goals });
    expect(got[0]).toMatchObject({ goalId: null, accountId: B, sourceAccountId: A });
  });

  // A premium auto-debited from the account it already sits in.
  it('treats an item with no destination as money staying put, not as unconfigured', () => {
    const got = routeLineItems([item()], 'splitGoals', { goals });
    expect(got[0]).toMatchObject({ accountId: null, missingTarget: false });
  });

  // A goal that has since been deleted IS a broken pointer.
  it('flags an item naming a goal that no longer exists', () => {
    const got = routeLineItems([item({ goalId: 'gone' })], 'splitGoals', { goals });
    expect(got[0].missingTarget).toBe(true);
  });

  it('falls back to the line source, then the hub, when an item names no source', () => {
    const noSource = item({ fromAccountId: null });
    expect(routeLineItems([noSource], 'splitGoals', { goals, fallbackSource: B })[0].sourceAccountId).toBe(B);
    expect(routeLineItems([noSource], 'splitGoals', { goals, settings: { hubAccountId: HUB } })[0].sourceAccountId).toBe(HUB);
  });

  // The thing one source per line could never express.
  it('lets one line be paid from two different accounts', () => {
    const got = routeLineItems(
      [item({ id: '1', fromAccountId: A, amount: 95 }), item({ id: '2', fromAccountId: B, amount: 30, sortOrder: 1 })],
      'splitGoals',
      { goals }
    );
    expect(got.map((r) => [r.sourceAccountId, r.amount])).toEqual([[A, 95], [B, 30]]);
  });

  it('is empty for a line with no items', () => {
    expect(routeLineItems([], 'splitGoals', { goals })).toEqual([]);
  });
});

describe('getLineItemDiffs', () => {
  const settings = { splitGoals: 200, splitTrading: 50 };

  it('says nothing when the items add up to the plan', () => {
    const items = [item({ amount: 120 }), item({ id: 'b', amount: 80, sortOrder: 1 })];
    expect(getLineItemDiffs(items, settings)).toEqual([]);
  });

  // Routing a different amount from the one the plan states is how a split
  // stops being checkable.
  it('reports a line whose items do not add up to it', () => {
    const items = [item({ amount: 120 })];
    expect(getLineItemDiffs(items, settings)).toEqual([
      { key: 'splitGoals', label: 'Goals', planned: 200, itemised: 120, difference: -80 },
    ]);
  });

  it('ignores lines that are not itemised at all', () => {
    expect(getLineItemDiffs([], settings)).toEqual([]);
  });

  it('tolerates float dust from the numeric round trip', () => {
    const items = [item({ amount: 199.999 })];
    expect(getLineItemDiffs(items, { splitGoals: 200 })).toEqual([]);
  });

  it('survives no settings', () => {
    expect(getLineItemDiffs([item()], null)).toEqual([]);
  });
});

describe('source accounts', () => {
  const items = [
    item({ id: '1', fromAccountId: A, amount: 95 }),
    item({ id: '2', fromAccountId: B, amount: 30 }),
    item({ id: '3', fromAccountId: A, amount: 5, lineKey: 'splitTrading' }),
    item({ id: '4', fromAccountId: null, amount: 1 }),
  ];

  it('lists every account the plan draws on, once each', () => {
    expect(getItemSourceAccounts(items).sort()).toEqual([A, B]);
  });

  it('totals what one account pays out across every line', () => {
    expect(getItemisedOutflow(items, A)).toBe(100);
    expect(getItemisedOutflow(items, B)).toBe(30);
    expect(getItemisedOutflow(items, 'nobody')).toBe(0);
    expect(getItemisedOutflow(items, null)).toBe(0);
  });
});
