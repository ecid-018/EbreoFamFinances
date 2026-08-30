const STORAGE_KEY = 'ebreo-family-finances:v1';

export function loadPersistedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistData(domainState) {
  const { envelopes, transactions, income, accounts, goals } = domainState;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ envelopes, transactions, income, accounts, goals })
    );
  } catch {
    // localStorage unavailable (e.g. private browsing quota) — fail silently, in-memory state still works
  }
}
