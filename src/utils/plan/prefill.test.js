import { describe, it, expect } from 'vitest';
import {
  OVERLAP_GROUPS,
  MIN_CONFIDENCE,
  tokenise,
  similarity,
  suggestMapping,
  suggestMappings,
  distributeProportionally,
  buildEnvelopeProposal,
  resolveBalancingLine,
  matchGoals,
  validatePlanFile,
} from './prefill.js';

// Every figure below is invented.
const env = (id, name, monthlyBudget, group = 'G') => ({ id, name, monthlyBudget, group });

function validFile(over = {}) {
  return {
    version: 'v1',
    pay: { household: 100, hub: 900 },
    split: { alpha: 500, beta: 400, balancing_line: 'alpha' },
    household_targets: [{ label: 'Food and groceries', sea: 60, vacation: 80 }],
    goals: [{ name: 'Example fund', target: 1000 }],
    ...over,
  };
}

describe('tokenise', () => {
  it('lowercases, splits on punctuation and drops stopwords', () => {
    expect(tokenise('Food and Groceries')).toEqual(['food', 'groceries']);
    expect(tokenise('Child: school & needs')).toEqual(['child', 'school', 'needs']);
  });

  it('survives empty and nullish input', () => {
    expect(tokenise('')).toEqual([]);
    expect(tokenise(null)).toEqual([]);
    expect(tokenise('  &&  ')).toEqual([]);
  });
});

describe('similarity', () => {
  it('is 1 for the same tokens in any order or casing', () => {
    expect(similarity('Food and groceries', 'Groceries food')).toBe(1);
  });

  it('is 0 when nothing is shared', () => {
    expect(similarity('Buffer', 'Transport')).toBe(0);
  });

  it('is 0 rather than NaN when a side has no usable tokens', () => {
    expect(similarity('and the', 'Transport')).toBe(0);
  });

  it('scores a partial overlap between 0 and 1', () => {
    const score = similarity('Transport and fuel', 'Transport');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

describe('suggestMapping', () => {
  const groups = ['Groceries', 'Transport', 'Mortgage'];
  const envelopes = [env('e1', 'Food & Groceries', 10), env('e2', 'Internet', 5)];

  it('prefers the strongest match across groups and envelopes', () => {
    const got = suggestMapping('Food and groceries', groups, envelopes);
    expect(got).toMatchObject({ kind: 'envelope', id: 'e1' });
  });

  it('returns null rather than guessing below the threshold', () => {
    expect(suggestMapping('Buffer', groups, envelopes)).toBeNull();
    expect(suggestMapping('Gifts and giving', groups, envelopes)).toBeNull();
  });

  it('breaks a tie towards the group', () => {
    // 'Utilities and internet' scores the same against the group 'Utilities'
    // and the envelope 'Internet'; the coarser target wins.
    const got = suggestMapping('Utilities and internet', ['Utilities'], [env('e2', 'Internet', 5)]);
    expect(got).toMatchObject({ kind: 'group', id: 'Utilities' });
  });

  it('honours a caller-supplied threshold', () => {
    expect(suggestMapping('Transport and fuel', groups, [], 0.9)).toBeNull();
    expect(suggestMapping('Transport and fuel', groups, [], 0.4)).toMatchObject({ id: 'Transport' });
  });

  it('copes with no candidates at all', () => {
    expect(suggestMapping('Anything', [], [])).toBeNull();
  });

  it('exposes a threshold that leaves unrelated labels unmapped', () => {
    expect(MIN_CONFIDENCE).toBeGreaterThan(0);
    const results = suggestMappings(
      [{ label: 'Transport and fuel' }, { label: 'Buffer' }],
      groups,
      envelopes
    );
    expect(results[0].suggestion).not.toBeNull();
    expect(results[1].suggestion).toBeNull();
  });
});

describe('distributeProportionally', () => {
  it('splits in proportion to current budgets', () => {
    const got = distributeProportionally(300, [env('a', 'A', 100), env('b', 'B', 200)]);
    expect(got).toEqual([{ id: 'a', amount: 100 }, { id: 'b', amount: 200 }]);
  });

  it('always re-sums to the target exactly, despite rounding', () => {
    // Thirds: a naive round per item drifts and leaves a centavo unassigned.
    const got = distributeProportionally(100, [env('a', 'A', 1), env('b', 'B', 1), env('c', 'C', 1)]);
    const total = got.reduce((sum, g) => sum + g.amount, 0);
    expect(Number(total.toFixed(2))).toBe(100);
  });

  it('splits equally when every current budget is zero', () => {
    const got = distributeProportionally(90, [env('a', 'A', 0), env('b', 'B', 0), env('c', 'C', 0)]);
    expect(got.map((g) => g.amount)).toEqual([30, 30, 30]);
  });

  it('treats a negative budget as zero weight rather than inverting the split', () => {
    const got = distributeProportionally(100, [env('a', 'A', -50), env('b', 'B', 100)]);
    expect(got).toEqual([{ id: 'a', amount: 0 }, { id: 'b', amount: 100 }]);
  });

  it('returns an empty list for an empty group', () => {
    expect(distributeProportionally(100, [])).toEqual([]);
  });

  it('handles a zero target', () => {
    const got = distributeProportionally(0, [env('a', 'A', 100), env('b', 'B', 200)]);
    expect(got.map((g) => g.amount)).toEqual([0, 0]);
  });

  it('keeps a single envelope whole', () => {
    expect(distributeProportionally(123.45, [env('a', 'A', 10)])).toEqual([{ id: 'a', amount: 123.45 }]);
  });
});

describe('buildEnvelopeProposal', () => {
  const envelopes = [
    env('a', 'A', 100, 'Grp'),
    env('b', 'B', 300, 'Grp'),
    env('c', 'C', 50, 'Other'),
  ];
  const targets = [{ label: 'T1', sea: 40, vacation: 80 }, { label: 'T2', sea: 400, vacation: 500 }];

  it('assigns a target mapped to an envelope directly', () => {
    const got = buildEnvelopeProposal(targets, { T1: { kind: 'envelope', id: 'c' } }, envelopes);
    expect(got).toEqual({ c: 40 });
  });

  it('spreads a target mapped to a group across its envelopes', () => {
    const got = buildEnvelopeProposal(targets, { T2: { kind: 'group', id: 'Grp' } }, envelopes);
    expect(got).toEqual({ a: 100, b: 300 });
  });

  it('leaves unmapped targets and untouched envelopes out entirely', () => {
    const got = buildEnvelopeProposal(targets, { T1: { kind: 'envelope', id: 'c' } }, envelopes);
    expect(got).not.toHaveProperty('a');
    expect(got).not.toHaveProperty('b');
  });

  it('adds together two targets pointing at the same envelope', () => {
    const got = buildEnvelopeProposal(
      targets,
      { T1: { kind: 'envelope', id: 'c' }, T2: { kind: 'envelope', id: 'c' } },
      envelopes
    );
    expect(got).toEqual({ c: 440 });
  });

  it('can read the vacation figures instead of sea', () => {
    const got = buildEnvelopeProposal(targets, { T1: { kind: 'envelope', id: 'c' } }, envelopes, 'vacation');
    expect(got).toEqual({ c: 80 });
  });

  it('returns nothing when no mapping is confirmed', () => {
    expect(buildEnvelopeProposal(targets, {}, envelopes)).toEqual({});
  });

  it('ignores a group mapping that matches no envelopes', () => {
    expect(buildEnvelopeProposal(targets, { T1: { kind: 'group', id: 'Nope' } }, envelopes)).toEqual({});
  });
});

describe('resolveBalancingLine', () => {
  const lines = { alpha: 500, beta: 300, gamma: 200 }; // planned total 1000

  it('leaves every line alone when the actual matches the plan', () => {
    const got = resolveBalancingLine(lines, 1000, 'alpha');
    expect(got.resolved).toEqual(lines);
    expect(got.difference).toBe(0);
    expect(got.belowZero).toBe(false);
  });

  it('gives a surplus to the balancing line only', () => {
    const got = resolveBalancingLine(lines, 1200, 'alpha');
    expect(got.resolved).toEqual({ alpha: 700, beta: 300, gamma: 200 });
    expect(got.difference).toBe(200);
  });

  it('takes a shortfall out of the balancing line only', () => {
    const got = resolveBalancingLine(lines, 900, 'alpha');
    expect(got.resolved).toEqual({ alpha: 400, beta: 300, gamma: 200 });
  });

  it('flags a balancing line driven below zero', () => {
    const got = resolveBalancingLine(lines, 400, 'alpha');
    expect(got.balancingAmount).toBe(-100);
    expect(got.belowZero).toBe(true);
  });

  it('reports the difference as unabsorbed when the key is not a real line', () => {
    const got = resolveBalancingLine(lines, 1200, 'nope');
    expect(got.resolved).toEqual(lines);
    expect(got.unabsorbed).toBe(200);
    expect(got.balancingAmount).toBeNull();
  });
});

describe('matchGoals', () => {
  const existing = [
    { id: 'g1', name: 'Emergency Fund', target: 1000, saved: 250 },
    { id: 'g2', name: 'Singapore Trip', target: 500, saved: 100 },
  ];

  it('matches by name ignoring case and surrounding space', () => {
    const [got] = matchGoals([{ name: '  emergency fund ', target: 2000 }], existing);
    expect(got.action).toBe('update');
    expect(got.existing.id).toBe('g1');
    expect(got.currentTarget).toBe(1000);
    expect(got.proposedTarget).toBe(2000);
  });

  it('proposes creating a goal that does not exist', () => {
    const [got] = matchGoals([{ name: 'Brand new fund', target: 300 }], existing);
    expect(got.action).toBe('create');
    expect(got.existing).toBeNull();
    expect(got.currentTarget).toBeNull();
  });

  it('never proposes a change to saved', () => {
    const [got] = matchGoals([{ name: 'Emergency Fund', target: 9999 }], existing);
    expect(got.saved).toBe(250);
    expect(got).not.toHaveProperty('proposedSaved');
  });

  it('leaves existing goals absent from the file alone', () => {
    const got = matchGoals([{ name: 'Emergency Fund', target: 1 }], existing);
    expect(got).toHaveLength(1);
    expect(got.map((g) => g.existing?.id)).not.toContain('g2');
  });

  it('is not fuzzy — a near name creates rather than retargets', () => {
    const [got] = matchGoals([{ name: 'Emergency Funds' }], existing);
    expect(got.action).toBe('create');
  });
});

describe('validatePlanFile', () => {
  it('accepts a well-formed file', () => {
    expect(validatePlanFile(validFile())).toEqual({ ok: true, errors: [] });
  });

  it('rejects something that is not an object', () => {
    for (const bad of [null, [], 'text', 42]) {
      expect(validatePlanFile(bad).ok).toBe(false);
    }
  });

  it('requires pay figures to be numbers', () => {
    const got = validatePlanFile(validFile({ pay: { household: '100', hub: 900 } }));
    expect(got.ok).toBe(false);
    expect(got.errors.join(' ')).toContain('pay.household');
  });

  it('rejects a negative pay figure', () => {
    expect(validatePlanFile(validFile({ pay: { household: -1, hub: 900 } })).ok).toBe(false);
  });

  it('requires balancing_line to name a real split line', () => {
    const got = validatePlanFile(validFile({ split: { alpha: 1, beta: 2, balancing_line: 'missing' } }));
    expect(got.ok).toBe(false);
    expect(got.errors.join(' ')).toContain('balancing_line');
  });

  it('rejects duplicate target labels', () => {
    const got = validatePlanFile(
      validFile({
        household_targets: [
          { label: 'Food', sea: 1 },
          { label: ' food ', sea: 2 },
        ],
      })
    );
    expect(got.ok).toBe(false);
    expect(got.errors.join(' ')).toContain('more than once');
  });

  it('rejects duplicate goal names', () => {
    const got = validatePlanFile(
      validFile({ goals: [{ name: 'A', target: 1 }, { name: 'a', target: 2 }] })
    );
    expect(got.ok).toBe(false);
  });

  it('requires a goal target above zero', () => {
    expect(validatePlanFile(validFile({ goals: [{ name: 'A', target: 0 }] })).ok).toBe(false);
  });

  it('accepts an empty goals array', () => {
    expect(validatePlanFile(validFile({ goals: [] })).ok).toBe(true);
  });

  it('checks optional goal fields only when present', () => {
    expect(validatePlanFile(validFile({ goals: [{ name: 'A', target: 1, sinking: true }] })).ok).toBe(true);
    expect(validatePlanFile(validFile({ goals: [{ name: 'A', target: 1, sinking: 'yes' }] })).ok).toBe(false);
    expect(validatePlanFile(validFile({ goals: [{ name: 'A', target: 1, target_date: '2030-1-1' }] })).ok).toBe(false);
    expect(validatePlanFile(validFile({ goals: [{ name: 'A', target: 1, target_date: '2030-01-01' }] })).ok).toBe(true);
  });

  it('requires at least one household target', () => {
    expect(validatePlanFile(validFile({ household_targets: [] })).ok).toBe(false);
  });

  it('allows a target with no vacation figure', () => {
    expect(validatePlanFile(validFile({ household_targets: [{ label: 'X', sea: 5 }] })).ok).toBe(true);
  });

  it('collects every problem rather than stopping at the first', () => {
    const got = validatePlanFile({ version: '', pay: {}, split: {}, household_targets: [], goals: 'no' });
    expect(got.errors.length).toBeGreaterThan(3);
  });
});

describe('OVERLAP_GROUPS', () => {
  it('names the groups that mirror plan lines rather than household spending', () => {
    expect(OVERLAP_GROUPS).toContain('Savings');
    expect(OVERLAP_GROUPS).toContain('Insurance');
    expect(OVERLAP_GROUPS).toContain('Trading Allowance');
  });
});
