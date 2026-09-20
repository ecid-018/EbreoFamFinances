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
  describeJsonError,
  buildApplySteps,
  summariseSteps,
  runSteps,
  OVERLAP_CHOICE,
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

describe('buildApplySteps', () => {
  const envelopes = [env('a', 'A', 100), env('b', 'B', 200), env('s', 'S', 300, 'Savings')];
  const existingGoal = {
    id: 'g1',
    name: 'Existing',
    target: 1000,
    saved: 400,
    priority: 3,
    targetDate: '2030-01-01',
    heldInAccountId: 'acct-1',
    isSinkingFund: false,
    goalGroup: 'Old group',
  };
  const base = {
    plan: { goals: [] },
    envelopes,
    proposed: {},
    overlapChoices: {},
    goals: [existingGoal],
    goalTargets: {},
    monthKey: '2026-10',
  };

  it('writes a budget row only where the figure actually differs', () => {
    const steps = buildApplySteps({ ...base, proposed: { a: 150, b: 200 } });
    expect(steps).toHaveLength(1);
    expect(steps[0].action).toEqual({
      type: 'envelope/setMonthBudget',
      payload: { envelopeId: 'a', monthKey: '2026-10', amount: 150 },
    });
  });

  it('zeroes an overlapping envelope only when explicitly chosen', () => {
    expect(buildApplySteps({ ...base, overlapChoices: { s: OVERLAP_CHOICE.UNTOUCHED } })).toHaveLength(0);
    expect(buildApplySteps({ ...base, overlapChoices: { s: OVERLAP_CHOICE.KEEP } })).toHaveLength(0);
    const zeroed = buildApplySteps({ ...base, overlapChoices: { s: OVERLAP_CHOICE.ZERO } });
    expect(zeroed).toHaveLength(1);
    expect(zeroed[0].action.payload).toMatchObject({ envelopeId: 's', amount: 0 });
  });

  it('does not zero an envelope that is already zero', () => {
    const steps = buildApplySteps({
      ...base,
      envelopes: [env('s', 'S', 0, 'Savings')],
      overlapChoices: { s: OVERLAP_CHOICE.ZERO },
    });
    expect(steps).toHaveLength(0);
  });

  it('creates a goal with every field the file carries', () => {
    const plan = {
      goals: [{ name: 'New fund', target: 500, priority: 2, group: 'Grp', target_date: '2031-06-01', sinking: true }],
    };
    const [step] = buildApplySteps({ ...base, plan });
    expect(step.kind).toBe('goalCreate');
    expect(step.action).toEqual({
      type: 'goal/add',
      payload: {
        name: 'New fund',
        target: 500,
        saved: 0,
        priority: 2,
        targetDate: '2031-06-01',
        goalGroup: 'Grp',
        isSinkingFund: true,
        heldInAccountId: null,
      },
    });
  });

  it('never sends a saved amount on an update', () => {
    const plan = { goals: [{ name: 'Existing', target: 2000 }] };
    const [step] = buildApplySteps({ ...base, plan });
    expect(step.kind).toBe('goalUpdate');
    expect(step.action.payload).not.toHaveProperty('saved');
  });

  it('carries heldInAccountId through, since the file has no such field', () => {
    // repo.updateGoal writes every column unconditionally, so omitting this
    // would silently clear which account holds the goal.
    const plan = { goals: [{ name: 'Existing', target: 2000 }] };
    const [step] = buildApplySteps({ ...base, plan });
    expect(step.action.payload.heldInAccountId).toBe('acct-1');
  });

  it('keeps existing plan fields when the file does not override them', () => {
    const plan = { goals: [{ name: 'Existing', target: 2000 }] };
    const [step] = buildApplySteps({ ...base, plan });
    expect(step.action.payload).toMatchObject({
      priority: 3,
      targetDate: '2030-01-01',
      goalGroup: 'Old group',
      isSinkingFund: false,
    });
  });

  it('lets the file override an existing plan field', () => {
    const plan = { goals: [{ name: 'Existing', target: 1000, priority: 9, sinking: true }] };
    const [step] = buildApplySteps({ ...base, plan });
    expect(step.action.payload).toMatchObject({ priority: 9, isSinkingFund: true });
  });

  it('skips a goal that would not change at all', () => {
    const plan = {
      goals: [
        { name: 'Existing', target: 1000, priority: 3, group: 'Old group', target_date: '2030-01-01' },
      ],
    };
    expect(buildApplySteps({ ...base, plan })).toHaveLength(0);
  });

  it('honours an edited target from the preview over the file', () => {
    const plan = { goals: [{ name: 'Existing', target: 2000 }] };
    const [step] = buildApplySteps({ ...base, plan, goalTargets: { Existing: 7777 } });
    expect(step.action.payload.target).toBe(7777);
  });

  it('orders budgets before goals', () => {
    const plan = { goals: [{ name: 'New fund', target: 500 }] };
    const steps = buildApplySteps({ ...base, plan, proposed: { a: 150 } });
    expect(steps.map((s) => s.kind)).toEqual(['budget', 'goalCreate']);
  });

  it('never emits a delete of any kind', () => {
    const plan = { goals: [{ name: 'New fund', target: 500 }] };
    const steps = buildApplySteps({ ...base, plan, proposed: { a: 0 }, overlapChoices: { s: OVERLAP_CHOICE.ZERO } });
    expect(steps.every((s) => !/remove|delete/i.test(s.action.type))).toBe(true);
  });

  it('ignores a proposed figure for an envelope that no longer exists', () => {
    expect(buildApplySteps({ ...base, proposed: { gone: 50 } })).toHaveLength(0);
  });
});

describe('summariseSteps', () => {
  it('counts each kind', () => {
    const steps = [
      { kind: 'budget' }, { kind: 'budget' }, { kind: 'zero' },
      { kind: 'goalCreate' }, { kind: 'goalUpdate' },
    ];
    expect(summariseSteps(steps)).toEqual({
      budgets: 2, zeroed: 1, goalsCreated: 1, goalsUpdated: 1, total: 5,
    });
  });

  it('handles an empty list', () => {
    expect(summariseSteps([])).toEqual({ budgets: 0, zeroed: 0, goalsCreated: 0, goalsUpdated: 0, total: 0 });
  });
});

describe('runSteps', () => {
  const step = (n) => ({ kind: 'budget', label: `step ${n}`, action: { type: 't', payload: { n } } });

  it('runs every step in order and reports success', async () => {
    const seen = [];
    const got = await runSteps([step(1), step(2), step(3)], async (a) => seen.push(a.payload.n));
    expect(seen).toEqual([1, 2, 3]);
    expect(got.ok).toBe(true);
    expect(got.applied).toHaveLength(3);
    expect(got.remaining).toHaveLength(0);
  });

  it('stops at the first failure and reports both sides', async () => {
    const seen = [];
    const got = await runSteps([step(1), step(2), step(3)], async (a) => {
      if (a.payload.n === 2) throw new Error('boom');
      seen.push(a.payload.n);
    });
    expect(seen).toEqual([1]);
    expect(got.ok).toBe(false);
    expect(got.applied.map((s) => s.label)).toEqual(['step 1']);
    expect(got.failed.step.label).toBe('step 2');
    expect(got.failed.message).toBe('boom');
    expect(got.remaining.map((s) => s.label)).toEqual(['step 3']);
  });

  it('does not count the failing step as applied', async () => {
    const got = await runSteps([step(1)], async () => {
      throw new Error('nope');
    });
    expect(got.applied).toHaveLength(0);
    expect(got.remaining).toHaveLength(0);
  });

  it('reports progress as it goes', async () => {
    const seen = [];
    await runSteps([step(1), step(2)], async () => {}, (p) => seen.push(`${p.done}/${p.total}`));
    expect(seen).toEqual(['1/2', '2/2']);
  });

  it('stops on a resolved failure outcome, not only a thrown error', async () => {
    // How the app's dispatch actually reports failure.
    const got = await runSteps([step(1), step(2)], async (a) =>
      a.payload.n === 2 ? { ok: false, error: new Error('rejected by server') } : { ok: true }
    );
    expect(got.ok).toBe(false);
    expect(got.applied).toHaveLength(1);
    expect(got.failed.message).toBe('rejected by server');
  });

  it('treats a resolved ok outcome as success', async () => {
    const got = await runSteps([step(1), step(2)], async () => ({ ok: true }));
    expect(got.ok).toBe(true);
    expect(got.applied).toHaveLength(2);
  });

  it('succeeds trivially on an empty list', async () => {
    const got = await runSteps([], async () => { throw new Error('never'); });
    expect(got.ok).toBe(true);
  });

  it('survives a thrown non-Error', async () => {
    const got = await runSteps([step(1)], async () => { throw 'plain string'; });
    expect(got.failed.message).toBe('plain string');
  });
});

describe('describeJsonError', () => {
  function caught(raw) {
    try {
      JSON.parse(raw);
    } catch (err) {
      return describeJsonError(raw, err);
    }
    throw new Error('expected a parse failure');
  }

  it('points at the offending line and hands back its text', () => {
    const got = caught('{\n  "a": 1,\n  "b": 2x3\n}');
    expect(got.line).toBe(3);
    expect(got.snippet).toContain('"b"');
  });

  it('derives line and column when only an offset is reported', () => {
    const got = describeJsonError('{\n  "a": 1,\n  "b": 2x3\n}', new Error('Bad JSON at position 20'));
    expect(got.line).toBe(3);
    expect(got.column).toBe(9);
  });

  it('survives an error with no position information', () => {
    const got = describeJsonError('{}', new Error('something else'));
    expect(got.line).toBeNull();
    expect(got.snippet).toBeNull();
    expect(got.message).toBe('something else');
  });

  it('survives a line number past the end of the file', () => {
    expect(describeJsonError('{}', new Error('at line 99 column 1')).snippet).toBeNull();
  });

  it('handles a non-Error being thrown', () => {
    expect(describeJsonError('{}', 'plain string').message).toBe('plain string');
  });
});
