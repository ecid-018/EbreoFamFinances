// Dynamic logo lookup via Brandfetch's CDN, for accounts without a
// hand-picked local asset (see BRAND_STYLES in cardStyle.js for those).
//
// Domains here are individually VERIFIED by fetching and looking at the
// actual image — never guessed from a `.com`/`.com.ph` pattern. Guessing
// has already produced wrong companies: bpi.com resolves to "Bank Policy
// Institute" (a US think tank), and neither metrobank.com nor
// metrobank.com.ph resolves to the real Philippine Metrobank. Brands
// without a verified domain are deliberately absent here so they fall back
// to the plain type-label (see AccountCard.jsx) instead of risking the
// wrong institution's logo.
//
// bpi/bdo/maya are also deliberately absent — they use hand-picked local
// assets and never call Brandfetch.
const CLIENT_ID = import.meta.env.VITE_BRANDFETCH_CLIENT_ID;

export const BRANDFETCH_DOMAINS = {
  gcash: 'gcash.com',
  wise: 'wise.com',
  // Real institution is SeaBank Philippines; Brandfetch has no verified
  // SeaBank-specific entry. This domain resolves to sister Sea Limited
  // digital bank MariBank (Singapore)'s mark — visually very close,
  // unverified. Swap this domain if a real SeaBank match is ever confirmed.
  maribank: 'seabank.ph',
};

export function getBrandfetchLogoUrl(domain) {
  if (!CLIENT_ID || !domain) return null;
  return `https://cdn.brandfetch.io/${domain}?c=${CLIENT_ID}`;
}

// Matches the same substring convention getCardStyle uses in cardStyle.js,
// so both systems agree on which brand an account name refers to.
export function getBrandfetchUrlForAccountName(name) {
  const lower = name.toLowerCase();
  const key = Object.keys(BRANDFETCH_DOMAINS).find((brand) => lower.includes(brand));
  return key ? getBrandfetchLogoUrl(BRANDFETCH_DOMAINS[key]) : null;
}
