// Per-device memory of which household members have signed in on this
// device, so the pre-login picker can show them by name without the app
// bundle having to know any email address (RLS blocks reading `profiles`
// before sign-in, and shipping the emails in a public site's JS was the
// reason this exists). Stores email, display name, user id and the PIN's
// *length* — never the PIN itself — so the lock screen can keep
// auto-submitting at the right digit count.
const KEY = 'ebreo-family-finances:device-profiles';

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

function persist(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // localStorage unavailable — the picker just won't remember this device
  }
  return list;
}

export function loadDeviceProfiles() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p?.email === 'string') : [];
  } catch {
    return [];
  }
}

// Upsert by email, merging into whatever is already stored so a later
// sign-in that only knows pinLength doesn't wipe a known displayName.
export function saveDeviceProfile(profile) {
  const email = normalizeEmail(profile.email);
  if (!email) return loadDeviceProfiles();
  const current = loadDeviceProfiles();
  const existing = current.find((p) => p.email === email);
  const merged = { ...existing, ...profile, email };
  return persist([...current.filter((p) => p.email !== email), merged]);
}

export function removeDeviceProfile(email) {
  const target = normalizeEmail(email);
  return persist(loadDeviceProfiles().filter((p) => p.email !== target));
}

export function findDeviceProfile(email) {
  const target = normalizeEmail(email);
  return loadDeviceProfiles().find((p) => p.email === target) ?? null;
}
