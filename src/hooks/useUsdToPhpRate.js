import { useEffect, useState } from 'react';

const CACHE_KEY = 'ebreo-family-finances:usd-php-rate';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.rate !== 'number' || typeof parsed?.fetchedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(rate) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rate, fetchedAt: Date.now() }));
  } catch {
    // localStorage unavailable — rate just won't be cached across reloads
  }
}

// USD account balances are converted into the household's PHP total using this
// rate. Fetched only when a USD account exists, cached for 12h so the app
// isn't hitting the rate API on every load/focus. On failure, falls back to
// whatever's cached (however old) rather than guessing a number — the caller
// treats a null rate as "don't include USD in the total."
export function useUsdToPhpRate(enabled) {
  const cached = enabled ? readCache() : null;
  const [rate, setRate] = useState(cached?.rate ?? null);
  const [isStale, setIsStale] = useState(() => !cached || Date.now() - cached.fetchedAt > CACHE_TTL_MS);

  useEffect(() => {
    if (!enabled) return;
    const current = readCache();
    if (current && Date.now() - current.fetchedAt <= CACHE_TTL_MS) {
      setRate(current.rate);
      setIsStale(false);
      return;
    }

    let cancelled = false;
    // frankfurter.app (the old domain) 301-redirects here without CORS headers on
    // the redirect itself, which browsers block before ever reaching the real
    // response — hitting the current domain directly avoids that entirely.
    fetch('https://api.frankfurter.dev/v1/latest?from=USD&to=PHP')
      .then((res) => {
        if (!res.ok) throw new Error(`Rate API responded ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const nextRate = data?.rates?.PHP;
        if (typeof nextRate !== 'number' || cancelled) return;
        writeCache(nextRate);
        setRate(nextRate);
        setIsStale(false);
      })
      .catch((err) => {
        console.error('Failed to fetch USD→PHP rate:', err);
        if (cancelled) return;
        const fallback = readCache();
        setRate(fallback?.rate ?? null);
        setIsStale(true);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { rate, isStale };
}
