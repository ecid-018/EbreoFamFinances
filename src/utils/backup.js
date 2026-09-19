import { downloadFile } from './file.js';

// version 2 adds `transfers`. Version 1 backups predate the transfers table
// and silently contained no transfer history at all — anything restored from
// one of those would be missing every transfer ever made.
export function buildFullBackupJson(state) {
  const { envelopes, transactions, income, accounts, goals, ledger, transfers } = state;
  return JSON.stringify(
    {
      version: 2,
      exportedAt: new Date().toISOString(),
      envelopes,
      transactions,
      income,
      accounts,
      goals,
      ledger,
      transfers,
    },
    null,
    2
  );
}

export function downloadBackup(filename, jsonContent) {
  downloadFile(filename, jsonContent, 'application/json;charset=utf-8;');
}
