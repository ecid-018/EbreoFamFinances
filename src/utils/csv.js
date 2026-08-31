import { downloadFile } from './file.js';

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
  downloadFile(filename, csvContent, 'text/csv;charset=utf-8;');
}
