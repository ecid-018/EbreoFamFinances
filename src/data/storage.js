const STORAGE_KEY = 'ebreo-family-finances:v2';
const THEME_KEY = 'ebreo-family-finances:theme';

export function loadTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // localStorage unavailable — theme choice just won't persist across reloads
  }
}

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
  const { envelopes, transactions, income, accounts, goals, ledger } = domainState;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ envelopes, transactions, income, accounts, goals, ledger })
    );
  } catch {
    // localStorage unavailable (e.g. private browsing quota) — fail silently, in-memory state still works
  }
}
