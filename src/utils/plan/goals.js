// Pure goal logic: ordering, grouping, progress and the account
// reconciliation check. No React, no data access.

export function isGoalArchived(goal) {
  return goal.archivedAt != null;
}

export function isGoalAchieved(goal) {
  return goal.target > 0 && goal.saved >= goal.target;
}

// Lower priority sorts first; goals with no priority fall to the end rather
// than jumping ahead of a deliberately ordered list. Ties break on creation
// order so the list never reshuffles unpredictably.
export function compareGoals(a, b) {
  const ap = a.priority ?? Number.POSITIVE_INFINITY;
  const bp = b.priority ?? Number.POSITIVE_INFINITY;
  if (ap !== bp) return ap - bp;
  return String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? ''));
}

// Three buckets, because they answer different questions: what are we saving
// for, what bills are we pre-funding, and what is already done.
export function splitGoals(goals) {
  const active = goals.filter((g) => !isGoalArchived(g)).sort(compareGoals);
  return {
    goals: active.filter((g) => !g.isSinkingFund && !isGoalAchieved(g)),
    sinkingFunds: active.filter((g) => g.isSinkingFund),
    achieved: active.filter((g) => !g.isSinkingFund && isGoalAchieved(g)),
    archived: goals.filter(isGoalArchived).sort(compareGoals),
  };
}

// The headline "goals progress" figure counts only goals still being saved
// for. Sinking funds cycle up and down as bills are paid, so including them
// would make progress lurch for reasons that are not progress; archived and
// achieved goals would permanently inflate or deflate it.
export function getGoalsProgressPct(goals) {
  const counted = goals.filter((g) => !isGoalArchived(g) && !g.isSinkingFund);
  const target = counted.reduce((t, g) => t + g.target, 0);
  if (target <= 0) return 0;
  const saved = counted.reduce((t, g) => t + g.saved, 0);
  return (saved / target) * 100;
}

// A goal_group is one real fund split across several accounts. Returns one
// row per group with combined totals, plus ungrouped goals on their own.
export function rollUpGoalGroups(goals) {
  const groups = [];
  const byLabel = new Map();
  for (const goal of goals) {
    if (!goal.goalGroup) {
      groups.push({ label: goal.name, goals: [goal], saved: goal.saved, target: goal.target, isGroup: false });
      continue;
    }
    let group = byLabel.get(goal.goalGroup);
    if (!group) {
      group = { label: goal.goalGroup, goals: [], saved: 0, target: 0, isGroup: true };
      byLabel.set(goal.goalGroup, group);
      groups.push(group);
    }
    group.goals.push(goal);
    group.saved += goal.saved;
    group.target += goal.target;
  }
  return groups;
}

// Goals claim to be "held in" an account, but nothing enforces that the
// account actually holds that much — `saved` and `balance` are independent
// stored numbers. This surfaces the discrepancy rather than correcting it:
// a gap is usually a real-world mismatch for a human to resolve, not a bug.
export function getAccountReconciliation(accounts, goals) {
  const active = goals.filter((g) => !isGoalArchived(g) && g.heldInAccountId);
  return accounts
    .filter((a) => active.some((g) => g.heldInAccountId === a.id))
    .map((account) => {
      const held = active.filter((g) => g.heldInAccountId === account.id);
      const claimed = held.reduce((t, g) => t + g.saved, 0);
      const gap = account.balance - claimed;
      return {
        account,
        goals: held,
        claimed,
        balance: account.balance,
        gap,
        // Goals claim more than the account holds — worth a look, not an error.
        isShort: gap < 0,
      };
    });
}
