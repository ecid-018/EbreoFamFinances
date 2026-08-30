function escapeCsvField(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildLedgerCsv(ledger) {
  const header = ['Date', 'Category', 'Type', 'Name', 'Amount'];
  const rows = ledger.map((entry) => [entry.date, entry.domain, entry.type, entry.name, entry.amount]);
  return [header, ...rows].map((row) => row.map(escapeCsvField).join(',')).join('\n');
}

export function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
