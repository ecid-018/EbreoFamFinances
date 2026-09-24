import { describe, it, expect } from 'vitest';
import {
  simulateGoalWaterfall,
  getGoalPace,
  getAshoreCountdown,
  getMonthsLate,
  formatProjectedMonth,
} from './simulate.js';

// Every figure here is invented. Fixed clock and a fixed start month so the
// suite cannot depend on when it runs.
const JAN_2026 = { year: 2026, monthIndex: 0 };

function goal(id, name, target, saved, priority, extra = {}) {
  return {
    id,
    name,
    target,
    saved,
    priority,
    isSinkingFund: false,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    targetDate: null,
    heldInAccountId: null,
    ...extra,
  };
}

describe('simulateGoalWaterfall', () => {
  it('fills goals in priority order and reports the month each one finishes', () => {
    const goals = [goal('a', 'First', 300, 0, 1), goal('b', 'Second', 200, 0, 2)];
    const result = simulateGoalWaterfall({
      goals,
      settings: { splitGoals: 100 },
      startMonth: JAN_2026,
    });

    expect(result.completions.map((c) => [c.goalName, c.monthKey])).toEqual([
      ['First', '2026-03'],
      ['Second', '2026-05'],
    ]);
    expect(result.unfinished).toEqual([]);
    expect(result.allFundedMonthKey).toBe('2026-05');
  });

  it('rolls the overshoot onward rather than overfunding a goal', () => {
    // 150/month against a goal needing 100 leaves 50 over in January, which
    // must land on the second goal: 50 + 150 finishes it in February. Without
    // the roll-on it would take until March.
    const goals = [goal('a', 'First', 100, 0, 1), goal('b', 'Second', 200, 0, 2)];
    const result = simulateGoalWaterfall({
      goals,
      settings: { splitGoals: 150 },
      startMonth: JAN_2026,
    });

    expect(result.completions).toEqual([
      { goalId: 'a', goalName: 'First', monthKey: '2026-01', monthsAway: 0 },
      { goalId: 'b', goalName: 'Second', monthKey: '2026-02', monthsAway: 1 },
    ]);
  });

  it('counts what is already saved', () => {
    const goals = [goal('a', 'Nearly there', 1000, 900, 1)];
    const result = simulateGoalWaterfall({
      goals,
      settings: { splitGoals: 100 },
      startMonth: JAN_2026,
    });
    expect(result.completions[0].monthKey).toBe('2026-01');
  });

  it('leaves sinking funds, archived and already-achieved goals out of the waterfall', () => {
    const goals = [
      goal('s', 'Insurance', 500, 0, 1, { isSinkingFund: true }),
      goal('x', 'Old', 500, 0, 1, { archivedAt: '2026-01-01T00:00:00.000Z' }),
      goal('d', 'Done', 500, 500, 1),
      goal('a', 'Real', 100, 0, 2),
    ];
    const result = simulateGoalWaterfall({
      goals,
      settings: { splitGoals: 100 },
      startMonth: JAN_2026,
    });
    expect(result.completions.map((c) => c.goalName)).toEqual(['Real']);
  });

  it('terminates instead of spinning when nothing funds the goals', () => {
    const goals = [goal('a', 'Unfunded', 100, 0, 1)];
    const result = simulateGoalWaterfall({
      goals,
      settings: { splitGoals: 0 },
      startMonth: JAN_2026,
    });

    expect(result.monthsRun).toBe(1);
    expect(result.completions).toEqual([]);
    expect(result.unfinished).toEqual([
      { goalId: 'a', goalName: 'Unfunded', saved: 0, target: 100, remaining: 100 },
    ]);
    // Something never finishes, so there is no month by which everything is
    // funded — reporting one would be a lie.
    expect(result.allFundedMonthKey).toBeNull();
  });

  it('stops at the horizon rather than running forever', () => {
    const goals = [goal('a', 'Huge', 1000000, 0, 1)];
    const result = simulateGoalWaterfall({
      goals,
      settings: { splitGoals: 1 },
      startMonth: JAN_2026,
      maxMonths: 12,
    });
    expect(result.monthsRun).toBe(12);
    expect(result.unfinished[0].remaining).toBe(999988);
  });

  it('routes a one-off inflow through the same waterfall', () => {
    const goals = [goal('a', 'First', 300, 0, 1)];
    const result = simulateGoalWaterfall({
      goals,
      settings: { splitGoals: 100 },
      startMonth: JAN_2026,
      inflows: [{ monthKey: '2026-02', amount: 100 }],
    });
    // 100 + (100+100) = 300 by February, a month earlier than without it.
    expect(result.completions[0].monthKey).toBe('2026-02');
  });

  it('takes a one-off outflow out of the goal it names', () => {
    const goals = [goal('a', 'Car', 1000, 900, 1)];
    const result = simulateGoalWaterfall({
      goals,
      settings: { splitGoals: 100 },
      startMonth: JAN_2026,
      outflows: [{ monthKey: '2026-01', amount: 500, goalId: 'a' }],
    });
    // 900 - 500 = 400, so it needs 600 more at 100/month.
    expect(result.completions[0].monthKey).toBe('2026-06');
  });

  it('reduces the month pool for an outflow that names no goal', () => {
    const goals = [goal('a', 'First', 200, 0, 1)];
    const result = simulateGoalWaterfall({
      goals,
      settings: { splitGoals: 100 },
      startMonth: JAN_2026,
      outflows: [{ monthKey: '2026-01', amount: 100 }],
    });
    expect(result.completions[0].monthKey).toBe('2026-03');
  });

  it('never lets an outflow push a goal below zero', () => {
    const goals = [goal('a', 'Small', 1000, 100, 1)];
    const result = simulateGoalWaterfall({
      goals,
      settings: { splitGoals: 500 },
      startMonth: JAN_2026,
      outflows: [{ monthKey: '2026-01', amount: 9999, goalId: 'a' }],
      maxMonths: 3,
    });
    expect(result.completions[0].monthKey).toBe('2026-02');
  });

  it('does not mutate the goals it is given', () => {
    const goals = [goal('a', 'First', 300, 0, 1)];
    simulateGoalWaterfall({ goals, settings: { splitGoals: 100 }, startMonth: JAN_2026 });
    expect(goals[0].saved).toBe(0);
  });

  describe('the pre-sign-off rule', () => {
    const settings = {
      splitGoals: 100,
      splitVacationReserve: 200,
      presignoffActive: true,
      presignoffVacationAmount: 50,
      vacationReserveTarget: 150,
      vacationGoalId: 'v',
    };

    it('reports the month the rule lapses and frees the held money into goals', () => {
      const goals = [
        goal('v', 'Vacation', 150, 0, 1, { isSinkingFund: true }),
        goal('a', 'First', 1000, 0, 2),
      ];
      const result = simulateGoalWaterfall({ goals, settings, startMonth: JAN_2026 });

      // The reserve takes 50 a month and reaches 150 in March; from April the
      // vacation line goes back to 200 and the goals line back to 100.
      expect(result.presignoffLapsesMonthKey).toBe('2026-03');
      // While held: goals get 100 + the 150 freed = 250 a month for 3 months
      // (750), then 100 a month. 750 + 100 + 100 + 50 -> April... May.
      expect(result.monthlyGoalMoney).toBe(250);
      expect(result.completions[0].monthKey).toBe('2026-06');
    });

    it('is null when the rule was never on', () => {
      const goals = [goal('a', 'First', 100, 0, 1)];
      const result = simulateGoalWaterfall({
        goals,
        settings: { splitGoals: 100 },
        startMonth: JAN_2026,
      });
      expect(result.presignoffLapsesMonthKey).toBeNull();
    });
  });

  it('survives no goals, no settings and no start month', () => {
    const result = simulateGoalWaterfall();
    expect(result.completions).toEqual([]);
    expect(result.unfinished).toEqual([]);
    expect(result.monthlyGoalMoney).toBe(0);
  });
});

describe('getGoalPace', () => {
  const dated = (saved) =>
    goal('a', 'Dated', 1200, saved, 1, {
      createdAt: '2026-01-01T00:00:00.000Z',
      targetDate: '2027-01-01',
    });

  // Half way through the year: 600 of 1200 is exactly on the line.
  const MID = new Date(2026, 6, 2);

  it('reports on track within one month of the line', () => {
    expect(getGoalPace(dated(600), { today: MID }).status).toBe('on-track');
    expect(getGoalPace(dated(650), { today: MID }).status).toBe('on-track');
  });

  it('reports ahead and behind with how many months', () => {
    const ahead = getGoalPace(dated(900), { today: MID });
    expect(ahead.status).toBe('ahead');
    expect(ahead.monthsOff).toBe(3);

    const behind = getGoalPace(dated(300), { today: MID });
    expect(behind.status).toBe('behind');
    expect(behind.monthsOff).toBe(3);
  });

  it('measures against the full target once the date has passed', () => {
    const late = getGoalPace(dated(1200), { today: new Date(2028, 0, 1) });
    expect(late.expected).toBe(1200);
    expect(late.status).toBe('on-track');
  });

  it('has no pace without a target date, a creation date or a target', () => {
    expect(getGoalPace(goal('a', 'No date', 100, 0, 1))).toBeNull();
    expect(getGoalPace({ ...dated(0), createdAt: null })).toBeNull();
    expect(getGoalPace({ ...dated(0), target: 0 })).toBeNull();
    expect(getGoalPace(null)).toBeNull();
  });

  it('has no pace when the target date is not after the creation date', () => {
    expect(getGoalPace({ ...dated(0), targetDate: '2025-06-01' })).toBeNull();
  });
});

describe('getAshoreCountdown', () => {
  const SEP_2026 = new Date(2026, 8, 23);

  it('counts to January of the target year', () => {
    expect(getAshoreCountdown(2030, { today: SEP_2026 })).toEqual({
      targetYear: 2030,
      monthsAway: 40,
      years: 3,
      months: 4,
      isHere: false,
    });
  });

  it('says it is here once the year arrives or has passed', () => {
    expect(getAshoreCountdown(2026, { today: SEP_2026 }).isHere).toBe(true);
    expect(getAshoreCountdown(2020, { today: SEP_2026 }).isHere).toBe(true);
  });

  it('is null when no year is set', () => {
    expect(getAshoreCountdown(null)).toBeNull();
    expect(getAshoreCountdown(undefined)).toBeNull();
  });
});

describe('getMonthsLate', () => {
  it('counts the months the projection lands after the date wanted', () => {
    expect(getMonthsLate('2027-08', '2027-05-01')).toBe(3);
    expect(getMonthsLate('2028-02', '2027-11-30')).toBe(3);
  });

  it('is zero when the projection lands on or before the date wanted', () => {
    expect(getMonthsLate('2027-05', '2027-05-01')).toBe(0);
    expect(getMonthsLate('2027-01', '2027-05-01')).toBe(0);
  });

  it('is zero when either date is missing', () => {
    expect(getMonthsLate(null, '2027-05-01')).toBe(0);
    expect(getMonthsLate('2027-08', null)).toBe(0);
  });
});

describe('formatProjectedMonth', () => {
  it('reads a month key as a short month and year', () => {
    expect(formatProjectedMonth('2027-03')).toBe('Mar 2027');
  });

  it('is empty for nothing', () => {
    expect(formatProjectedMonth(null)).toBe('');
  });
});
