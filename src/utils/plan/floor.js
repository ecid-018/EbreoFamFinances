import { canCountTowardFloor } from './accountTypes.js';

// The household's bank floor: the balance they intend to keep untouched.
// Deliberately narrow — only PHP bank accounts that have been explicitly
// tagged, and never an archived one. A USD account is excluded because the
// floor is a peso target and the conversion rate moves daily.
export function getBankFloorAccounts(accounts) {
  return accounts.filter(
    (a) =>
      a.countsTowardFloor === true &&
      canCountTowardFloor(a.type) &&
      (a.currency ?? 'PHP') === 'PHP' &&
      a.archivedAt == null
  );
}

export function getBankFloor(accounts) {
  return getBankFloorAccounts(accounts).reduce((total, a) => total + a.balance, 0);
}

// How the floor compares with its target. `target` may be null/undefined
// until the household sets one in Phase 3's plan settings, in which case
// there is nothing to report rather than a misleading zero.
export function getBankFloorStatus(accounts, target) {
  const current = getBankFloor(accounts);
  if (target == null || target <= 0) return { current, target: null, gap: null, isMet: null };
  const gap = current - target;
  return { current, target, gap, isMet: gap >= 0 };
}
