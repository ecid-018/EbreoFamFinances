import { downloadFile } from './file.js';

export function buildFullBackupJson(state) {
  const { envelopes, transactions, income, accounts, goals, ledger } = state;
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      envelopes,
      transactions,
      income,
      accounts,
      goals,
      ledger,
    },
    null,
    2
  );
}

export function downloadBackup(filename, jsonContent) {
  downloadFile(filename, jsonContent, 'application/json;charset=utf-8;');
}
