// The account-type and role vocabularies, in one place. These must stay in
// step with the CHECK constraints in supabase/schema.sql — a value the
// database rejects would surface as a failed save, not a validation message.

export const ACCOUNT_TYPES = [
  { value: 'bank', label: 'Bank' },
  { value: 'ewallet', label: 'E-wallet' },
  { value: 'cash', label: 'Cash' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'receivable', label: 'Receivable' },
];

export const ACCOUNT_ROLES = [
  { value: 'household', label: 'Household' },
  { value: 'daily', label: 'Daily spending' },
  { value: 'floor', label: 'Bank floor' },
  { value: 'hub', label: 'Hub' },
  { value: 'goals', label: 'Goals' },
  { value: 'trading', label: 'Trading' },
  { value: 'spare', label: 'Spare' },
];

// Money that is real but not spendable day to day. Kept out of the expense
// and goal-funding pickers: a co-op balance can only be spent through the
// co-op, and a receivable is owed to the household, not held by it.
export const NON_SPENDABLE_TYPES = ['cooperative', 'receivable'];

// Owed to the household rather than held by it, so it is excluded from
// balance totals and reported separately.
export const RECEIVABLE_TYPE = 'receivable';

// Only a real bank account can make up the bank floor.
export function canCountTowardFloor(type) {
  return type === 'bank';
}
