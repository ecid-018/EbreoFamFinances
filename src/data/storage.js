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

// Which alerts have been dismissed, and for which month.
//
// Deliberately per-device rather than per-household. Dismissing is "I have
// seen this", not "we have dealt with this" — if one of us clears an alert on
// their phone, the other should still be told the bank floor is short.
//
// The whole record is keyed by one period and discarded when it rolls over,
// which is what makes dismissals lapse monthly without anything expiring them.
const DISMISSED_ALERTS_KEY = 'ebreo-family-finances:dismissed-alerts';

export function loadDismissedAlerts(period) {
  try {
    const raw = localStorage.getItem(DISMISSED_ALERTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed?.period === period && Array.isArray(parsed.ids) ? parsed.ids : [];
  } catch {
    return [];
  }
}

export function saveDismissedAlerts(period, ids) {
  try {
    localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify({ period, ids }));
  } catch {
    // localStorage unavailable — dismissals just won't survive a reload
  }
}
