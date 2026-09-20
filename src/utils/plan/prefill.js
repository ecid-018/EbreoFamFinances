// Pure logic for the Settings -> Plan prefill tool: validating a local plan
// file, suggesting which existing envelope or group each spending line belongs
// to, splitting a group target across its envelopes, and working out how a
// payday split absorbs a different amount than planned.
//
// Nothing here touches React, the network or the clock, and no real figure
// appears in this file or its tests — the plan file itself is local and
// gitignored, and only the household ever sees its numbers.

// Groups whose envelopes mirror plan lines that are NOT household spending, so
// prefilling household targets over them would double-count. The tool lists
// them for an explicit per-envelope decision rather than guessing.
export const OVERLAP_GROUPS = ['Savings', 'Insurance', 'Trading Allowance'];

export const OVERLAP_CHOICE = { UNTOUCHED: 'untouched', ZERO: 'zero', KEEP: 'keep' };

// Below this, a name match is a coincidence rather than a suggestion. Chosen so
// that a shared significant word suggests ("Food and groceries" -> "Groceries")
// but an unrelated pair stays blank and waits to be mapped by hand.
export const MIN_CONFIDENCE = 0.5;

const STOPWORDS = new Set(['and', 'the', 'of', 'for', 'to', 'a', 'an', 'in', 'on', 'my', 'our']);

export function tokenise(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token && !STOPWORDS.has(token));
}

// Sorensen-Dice over token sets: shared tokens relative to how many there are
// in total, so a short label and a long one can still match strongly.
export function similarity(a, b) {
  const left = new Set(tokenise(a));
  const right = new Set(tokenise(b));
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return (2 * shared) / (left.size + right.size);
}

// One target maps to ONE group or ONE envelope. Returns null rather than a weak
// guess: a blank the household fills in is honest, a wrong suggestion they have
// to notice and undo is not.
export function suggestMapping(label, groups = [], envelopes = [], minConfidence = MIN_CONFIDENCE) {
  const candidates = [
    ...groups.map((group) => ({ kind: 'group', id: group, name: group })),
    ...envelopes.map((env) => ({ kind: 'envelope', id: env.id, name: env.name })),
  ];

  let best = null;
  for (const candidate of candidates) {
    const score = similarity(label, candidate.name);
    if (score < minConfidence) continue;
    // Ties go to the group: spreading a target across a whole group is easier
    // to correct than discovering it landed on one envelope inside it.
    const better =
      !best || score > best.score || (score === best.score && candidate.kind === 'group' && best.kind !== 'group');
    if (better) best = { ...candidate, score };
  }
  return best;
}

export function suggestMappings(targets = [], groups = [], envelopes = [], minConfidence = MIN_CONFIDENCE) {
  return targets.map((target) => ({
    label: target.label,
    suggestion: suggestMapping(target.label, groups, envelopes, minConfidence),
  }));
}

// Splits a group's target across its envelopes in proportion to what they are
// budgeted now. Works in centavos and hands out the rounding remainder by
// largest fractional part, so the parts always re-sum to the target exactly —
// a plain per-item round can drift by a few centavos and leave "left to
// assign" showing a number that cannot be cleared.
export function distributeProportionally(total, items = []) {
  if (!items.length) return [];

  const weights = items.map((item) => Math.max(0, Number(item.monthlyBudget) || 0));
  const weightTotal = weights.reduce((sum, w) => sum + w, 0);
  // Nothing to be proportional to (a brand new group, or every budget zeroed):
  // an equal split is the only defensible reading.
  const rawShares =
    weightTotal > 0 ? weights.map((w) => (total * w) / weightTotal) : items.map(() => total / items.length);

  const totalCents = Math.round(total * 100);
  const rawCents = rawShares.map((share) => share * 100);
  const floors = rawCents.map((c) => Math.floor(c));
  let remainder = totalCents - floors.reduce((sum, c) => sum + c, 0);

  const byFraction = rawCents
    .map((c, index) => ({ index, fraction: c - Math.floor(c) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let i = 0; remainder > 0 && i < byFraction.length * 2; i += 1) {
    floors[byFraction[i % byFraction.length].index] += 1;
    remainder -= 1;
  }

  return items.map((item, index) => ({ id: item.id, amount: floors[index] / 100 }));
}

// Turns confirmed mappings into a proposed budget per envelope. Only envelopes
// reached by a mapping appear: everything else is left exactly as it is, which
// is what "unmapped envelopes stay as they are" means in practice.
//
// Two targets pointing at the same envelope add together rather than the second
// silently winning.
export function buildEnvelopeProposal(targets = [], mappings = {}, envelopes = [], field = 'sea') {
  const proposal = {};
  const add = (id, amount) => {
    proposal[id] = Number(((proposal[id] ?? 0) + amount).toFixed(2));
  };

  for (const target of targets) {
    const mapping = mappings[target.label];
    if (!mapping) continue;
    const amount = Number(target[field]) || 0;

    if (mapping.kind === 'envelope') {
      add(mapping.id, amount);
      continue;
    }
    const members = envelopes.filter((envelope) => envelope.group === mapping.id);
    for (const share of distributeProportionally(amount, members)) add(share.id, share.amount);
  }
  return proposal;
}

// The payday split. Every line is fixed except the balancing one, which takes
// the difference between what was planned and what actually arrived.
export function resolveBalancingLine(lines = {}, actualAmount, balancingKey) {
  const keys = Object.keys(lines);
  const planned = keys.reduce((sum, key) => sum + (Number(lines[key]) || 0), 0);
  const actual = Number(actualAmount) || 0;
  const difference = actual - planned;

  if (!keys.includes(balancingKey)) {
    // Validation should have caught this; resolving to "nothing absorbs it" is
    // still better than silently dropping the difference.
    return { resolved: { ...lines }, planned, actual, difference, balancingAmount: null, belowZero: false, unabsorbed: difference };
  }

  const resolved = {};
  for (const key of keys) {
    resolved[key] = key === balancingKey ? (Number(lines[key]) || 0) + difference : Number(lines[key]) || 0;
  }
  const balancingAmount = resolved[balancingKey];
  return { resolved, planned, actual, difference, balancingAmount, belowZero: balancingAmount < 0, unabsorbed: 0 };
}

// Exact name match, case- and whitespace-insensitive. Deliberately not fuzzy:
// creating a duplicate goal is recoverable, silently retargeting the wrong one
// is not.
export function matchGoals(fileGoals = [], existingGoals = []) {
  const byName = new Map(existingGoals.map((goal) => [String(goal.name).trim().toLowerCase(), goal]));
  return fileGoals.map((fileGoal) => {
    const existing = byName.get(String(fileGoal.name).trim().toLowerCase()) ?? null;
    return {
      fileGoal,
      existing,
      action: existing ? 'update' : 'create',
      currentTarget: existing ? existing.target : null,
      proposedTarget: Number(fileGoal.target) || 0,
      // Never proposed, never written: a goal's saved amount is real money that
      // this tool has no business touching.
      saved: existing ? existing.saved : 0,
    };
  });
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validatePlanFile(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, errors: ['That file is not a plan object. Expected a JSON object like plan.example.json.'] };
  }

  if (typeof data.version !== 'string' || !data.version.trim()) {
    errors.push('Missing "version" — add a version string, e.g. "v10".');
  }

  const pay = data.pay;
  if (!pay || typeof pay !== 'object') {
    errors.push('Missing "pay" — expected an object with "household" and "hub".');
  } else {
    for (const key of ['household', 'hub']) {
      if (!isFiniteNumber(pay[key])) errors.push(`"pay.${key}" must be a number.`);
      else if (pay[key] < 0) errors.push(`"pay.${key}" cannot be negative.`);
    }
  }

  const split = data.split;
  if (!split || typeof split !== 'object') {
    errors.push('Missing "split" — expected an object of split lines plus "balancing_line".');
  } else {
    const numericKeys = Object.keys(split).filter((key) => key !== 'balancing_line');
    if (!numericKeys.length) errors.push('"split" has no lines in it.');
    for (const key of numericKeys) {
      if (!isFiniteNumber(split[key])) errors.push(`"split.${key}" must be a number.`);
    }
    if (typeof split.balancing_line !== 'string' || !split.balancing_line.trim()) {
      errors.push('"split.balancing_line" must name one of the split lines.');
    } else if (!numericKeys.includes(split.balancing_line)) {
      errors.push(`"split.balancing_line" is "${split.balancing_line}", which is not one of: ${numericKeys.join(', ')}.`);
    }
  }

  if (!Array.isArray(data.household_targets) || !data.household_targets.length) {
    errors.push('Missing "household_targets" — expected a non-empty array of spending lines.');
  } else {
    const seen = new Set();
    data.household_targets.forEach((target, index) => {
      const where = `household_targets[${index}]`;
      if (!target || typeof target !== 'object') {
        errors.push(`${where} is not an object.`);
        return;
      }
      if (typeof target.label !== 'string' || !target.label.trim()) errors.push(`${where}.label must be text.`);
      else {
        const key = target.label.trim().toLowerCase();
        if (seen.has(key)) errors.push(`${where}.label "${target.label}" appears more than once.`);
        seen.add(key);
      }
      if (!isFiniteNumber(target.sea)) errors.push(`${where}.sea must be a number.`);
      if (target.vacation !== undefined && !isFiniteNumber(target.vacation)) {
        errors.push(`${where}.vacation must be a number when present.`);
      }
    });
  }

  if (!Array.isArray(data.goals)) {
    errors.push('Missing "goals" — expected an array (it may be empty).');
  } else {
    const seen = new Set();
    data.goals.forEach((goal, index) => {
      const where = `goals[${index}]`;
      if (!goal || typeof goal !== 'object') {
        errors.push(`${where} is not an object.`);
        return;
      }
      if (typeof goal.name !== 'string' || !goal.name.trim()) errors.push(`${where}.name must be text.`);
      else {
        const key = goal.name.trim().toLowerCase();
        if (seen.has(key)) errors.push(`${where}.name "${goal.name}" appears more than once.`);
        seen.add(key);
      }
      if (!isFiniteNumber(goal.target)) errors.push(`${where}.target must be a number.`);
      else if (goal.target <= 0) errors.push(`${where}.target must be greater than 0.`);
      if (goal.priority !== undefined && !isFiniteNumber(goal.priority)) {
        errors.push(`${where}.priority must be a number when present.`);
      }
      if (goal.target_date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(goal.target_date))) {
        errors.push(`${where}.target_date must look like YYYY-MM-DD.`);
      }
      if (goal.sinking !== undefined && typeof goal.sinking !== 'boolean') {
        errors.push(`${where}.sinking must be true or false.`);
      }
    });
  }

  return { ok: errors.length === 0, errors };
}
