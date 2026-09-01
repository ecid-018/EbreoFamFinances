const formatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatPHP(amount) {
  const rounded = Math.round(amount || 0);
  return formatter.format(rounded).replace('PHP', '₱');
}

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function formatUSD(amount) {
  return usdFormatter.format(amount || 0);
}

export function formatByCurrency(amount, currency) {
  return currency === 'USD' ? formatUSD(amount) : formatPHP(amount);
}

const phpPreciseFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Fixed 2 decimal places, used only where amounts need to line up visually
// (the account cards) — every other PHP display keeps formatPHP's 0-decimal
// convention for this app.
export function formatPHPPrecise(amount) {
  return phpPreciseFormatter.format(amount || 0).replace('PHP', '₱');
}

// jsPDF's built-in fonts (Helvetica/Times/Courier) don't include the ₱ glyph —
// they render whatever character happens to occupy that byte position instead,
// which is why PDF exports showed garbled symbols. This ASCII-only formatter is
// for PDF output specifically; the on-screen app keeps using formatPHP() above.
export function formatPHPForPdf(amount) {
  const rounded = Math.round(amount || 0);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}PHP ${Math.abs(rounded).toLocaleString('en-US')}`;
}
