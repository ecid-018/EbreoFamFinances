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
