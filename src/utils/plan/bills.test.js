import { describe, it, expect } from 'vitest';
import {
  getPeriodMonths,
  getPeriodLabel,
  getMonthlyEquivalent,
  getFixedCostsPerMonth,
  getNextOccurrence,
  getDaysUntilDue,
  isOverdue,
  getDueSoon,
  splitBills,
  getPaymentDraft,
  SCHEDULE_KINDS,
  getKind,
  getKindMeta,
  isOverdueIncoming,
  groupByKind,
} from './bills.js';

// Every figure invented. Fixed clock: 15 June 2026.
const MID_JUNE = new Date(2026, 5, 15);

function bill(over = {}) {
  return {
    id: 'b1', name: 'Internet', amount: 1200, period: 'monthly',
    dueDay: 15, nextDue: '2026-06-20', accountId: null, envelopeId: null,
    goalId: null, isActive: true, ...over,
  };
}

describe('periods', () => {
  it('knows how many months each period covers', () => {
    expect(getPeriodMonths('monthly')).toBe(1);
    expect(getPeriodMonths('quarterly')).toBe(3);
    expect(getPeriodMonths('semiannual')).toBe(6);
    expect(getPeriodMonths('annual')).toBe(12);
  });

  it('falls back to monthly for anything unrecognised rather than dividing by nothing', () => {
    expect(getPeriodMonths('weekly')).toBe(1);
    expect(getPeriodLabel('weekly')).toBe('weekly');
  });
});

describe('monthly equivalent', () => {
  it('spreads a yearly bill across twelve months', () => {
    expect(getMonthlyEquivalent(bill({ amount: 1200, period: 'annual' }))).toBe(100);
  });

  it('leaves a monthly bill alone', () => {
    expect(getMonthlyEquivalent(bill({ amount: 1200, period: 'monthly' }))).toBe(1200);
  });

  it('is zero for a bill with no amount', () => {
    expect(getMonthlyEquivalent(bill({ amount: 0 }))).toBe(0);
    expect(getMonthlyEquivalent(null)).toBe(0);
  });

  it('sums only active bills', () => {
    const bills = [
      bill({ id: 'a', amount: 1200, period: 'annual' }),
      bill({ id: 'b', amount: 500, period: 'monthly' }),
      bill({ id: 'c', amount: 9000, period: 'monthly', isActive: false }),
    ];
    expect(getFixedCostsPerMonth(bills)).toBe(600);
    expect(getFixedCostsPerMonth([])).toBe(0);
  });
});

describe('getNextOccurrence', () => {
  it('uses this month when the day is still to come', () => {
    expect(getNextOccurrence(20, MID_JUNE)).toBe('2026-06-20');
  });

  it('counts today itself as still to come', () => {
    expect(getNextOccurrence(15, MID_JUNE)).toBe('2026-06-15');
  });

  it('rolls to next month once the day has passed', () => {
    expect(getNextOccurrence(3, MID_JUNE)).toBe('2026-07-03');
  });

  it('falls on the last day of a month too short for it', () => {
    // 31 Jan is fine; from 1 Feb the next 31st is 28 Feb 2027 (not a leap year).
    expect(getNextOccurrence(31, new Date(2027, 1, 1))).toBe('2027-02-28');
  });

  it('is null without a usable day', () => {
    expect(getNextOccurrence(null, MID_JUNE)).toBeNull();
    expect(getNextOccurrence(0, MID_JUNE)).toBeNull();
    expect(getNextOccurrence(32, MID_JUNE)).toBeNull();
  });
});

describe('due dates', () => {
  it('counts whole days until due', () => {
    expect(getDaysUntilDue(bill({ nextDue: '2026-06-20' }), MID_JUNE)).toBe(5);
    expect(getDaysUntilDue(bill({ nextDue: '2026-06-15' }), MID_JUNE)).toBe(0);
  });

  it('goes negative once the date has passed, and calls that overdue', () => {
    const late = bill({ nextDue: '2026-06-10' });
    expect(getDaysUntilDue(late, MID_JUNE)).toBe(-5);
    expect(isOverdue(late, MID_JUNE)).toBe(true);
  });

  it('does not call a bill due today overdue', () => {
    expect(isOverdue(bill({ nextDue: '2026-06-15' }), MID_JUNE)).toBe(false);
  });

  it('has nothing to say about a bill with no date', () => {
    expect(getDaysUntilDue(bill({ nextDue: null }), MID_JUNE)).toBeNull();
    expect(isOverdue(bill({ nextDue: null }), MID_JUNE)).toBe(false);
  });
});

describe('getDueSoon', () => {
  const bills = [
    bill({ id: 'far', nextDue: '2026-08-01' }),
    bill({ id: 'soon', nextDue: '2026-06-20' }),
    bill({ id: 'late', nextDue: '2026-06-01' }),
    bill({ id: 'off', nextDue: '2026-06-18', isActive: false }),
    bill({ id: 'undated', nextDue: null }),
  ];

  it('returns what falls inside the window, soonest first, overdue at the top', () => {
    expect(getDueSoon(bills, MID_JUNE).map((b) => b.id)).toEqual(['late', 'soon']);
  });

  it('leaves out inactive bills and bills with no date', () => {
    const got = getDueSoon(bills, MID_JUNE, 365).map((b) => b.id);
    expect(got).not.toContain('off');
    expect(got).not.toContain('undated');
  });

  it('respects the window', () => {
    expect(getDueSoon(bills, MID_JUNE, 2).map((b) => b.id)).toEqual(['late']);
    expect(getDueSoon(bills, MID_JUNE, 60).map((b) => b.id)).toEqual(['late', 'soon', 'far']);
  });

  it('tells each row how many days away it is', () => {
    expect(getDueSoon(bills, MID_JUNE)[0].daysUntilDue).toBe(-14);
  });

  it('is empty with no bills', () => {
    expect(getDueSoon([], MID_JUNE)).toEqual([]);
  });
});

describe('splitBills', () => {
  it('sorts active bills by when they fall due and keeps inactive ones apart', () => {
    const bills = [
      bill({ id: 'b', nextDue: '2026-07-01' }),
      bill({ id: 'a', nextDue: '2026-06-20' }),
      bill({ id: 'z', isActive: false }),
    ];
    const { active, inactive } = splitBills(bills);
    expect(active.map((b) => b.id)).toEqual(['a', 'b']);
    expect(inactive.map((b) => b.id)).toEqual(['z']);
  });

  it('sorts a bill with no date to the end rather than the front', () => {
    const bills = [bill({ id: 'undated', nextDue: null }), bill({ id: 'dated', nextDue: '2026-07-01' })];
    expect(splitBills(bills).active.map((b) => b.id)).toEqual(['dated', 'undated']);
  });
});

describe('getPaymentDraft', () => {
  it('prefills the expense form from the bill', () => {
    const b = bill({ amount: 1500, envelopeId: 'e1', accountId: 'a1' });
    expect(getPaymentDraft(b, MID_JUNE)).toEqual({
      billId: 'b1',
      date: '2026-06-15',
      amount: 1500,
      note: 'Internet',
      categoryId: 'e1',
      accountId: 'a1',
    });
  });

  it('leaves envelope and account empty when the bill names neither', () => {
    const draft = getPaymentDraft(bill(), MID_JUNE);
    expect(draft.categoryId).toBeNull();
    expect(draft.accountId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Schedule kinds (0014). Every figure invented.
// ---------------------------------------------------------------------------
describe('schedule kinds', () => {
  it('treats an item with no kind as a bill — every row was one before 0014', () => {
    expect(getKind({ name: 'Old row' })).toBe(SCHEDULE_KINDS.BILL);
    expect(getKind(null)).toBe(SCHEDULE_KINDS.BILL);
  });

  it('names what "done" means for each kind', () => {
    expect(getKindMeta(SCHEDULE_KINDS.BILL).action).toBe('Pay');
    expect(getKindMeta(SCHEDULE_KINDS.INCOMING).action).toBe('Received');
    expect(getKindMeta(SCHEDULE_KINDS.TASK).action).toBe('Done');
  });

  it('falls back to bill for an unrecognised kind rather than rendering nothing', () => {
    expect(getKindMeta('nonsense').value).toBe(SCHEDULE_KINDS.BILL);
  });
});

describe('fixed costs with mixed kinds', () => {
  it('counts only what is actually paid', () => {
    const items = [
      bill({ id: 'a', amount: 500, period: 'monthly', kind: 'bill' }),
      bill({ id: 'b', amount: 90000, period: 'monthly', kind: 'incoming' }),
      bill({ id: 'c', amount: 300, period: 'monthly', kind: 'task' }),
    ];
    expect(getFixedCostsPerMonth(items)).toBe(500);
  });

  it('still counts a legacy row with no kind at all', () => {
    const legacy = [{ ...bill({ amount: 500, period: 'monthly' }), kind: undefined }];
    expect(getFixedCostsPerMonth(legacy)).toBe(500);
  });
});

describe('isOverdueIncoming', () => {
  const incoming = (over = {}) => bill({ kind: 'incoming', ...over });

  it('is false inside the grace period', () => {
    expect(isOverdueIncoming(incoming({ nextDue: '2026-06-14' }), MID_JUNE)).toBe(false);
    expect(isOverdueIncoming(incoming({ nextDue: '2026-06-13' }), MID_JUNE)).toBe(false);
  });

  it('is true once the grace period has passed', () => {
    expect(isOverdueIncoming(incoming({ nextDue: '2026-06-12' }), MID_JUNE)).toBe(true);
  });

  it('never applies to a bill or a task, however late', () => {
    expect(isOverdueIncoming(bill({ kind: 'bill', nextDue: '2026-01-01' }), MID_JUNE)).toBe(false);
    expect(isOverdueIncoming(bill({ kind: 'task', nextDue: '2026-01-01' }), MID_JUNE)).toBe(false);
  });

  it('ignores an inactive item and one with no date', () => {
    expect(isOverdueIncoming(incoming({ nextDue: '2026-01-01', isActive: false }), MID_JUNE)).toBe(false);
    expect(isOverdueIncoming(incoming({ nextDue: null }), MID_JUNE)).toBe(false);
  });
});

describe('groupByKind', () => {
  const items = [
    bill({ id: 't', kind: 'task', nextDue: '2026-07-01' }),
    bill({ id: 'b2', kind: 'bill', nextDue: '2026-06-25' }),
    bill({ id: 'b1', kind: 'bill', nextDue: '2026-06-18' }),
    bill({ id: 'i', kind: 'incoming', nextDue: '2026-06-20' }),
    bill({ id: 'off', kind: 'task', nextDue: '2026-06-01', isActive: false }),
  ];

  it('groups in a fixed order, each sorted by when it falls due', () => {
    const groups = groupByKind(items);
    expect(groups.map((g) => g.value)).toEqual(['bill', 'incoming', 'task']);
    expect(groups[0].items.map((i) => i.id)).toEqual(['b1', 'b2']);
  });

  it('leaves out empty groups and inactive items', () => {
    expect(groupByKind(items)[2].items.map((i) => i.id)).toEqual(['t']);
    expect(groupByKind([bill({ kind: 'bill' })]).map((g) => g.value)).toEqual(['bill']);
    expect(groupByKind([])).toEqual([]);
  });
});
