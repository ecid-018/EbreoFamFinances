#!/usr/bin/env node
// One-time import of the household's real historical data (a JSON file from
// the app's "Export Full Backup" feature) into the live Supabase database.
//
// This writes transactions/income/ledger as plain historical rows, NEVER
// through the app's add_transaction/add_income RPCs — those RPCs also adjust
// an account's balance, which would double-count history that's already
// baked into the balances this script sets directly.
//
// Usage:
//   source .env.local   # for VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY=<paste from Supabase dashboard> \
//     node scripts/import-legacy-backup.mjs <path-to-backup.json> [--dry-run]
//
// Always run with --dry-run first and read the printed plan before running
// for real — this only ever runs once against real financial history.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const filePath = args.find((a) => !a.startsWith('--'));

if (!filePath) {
  console.error('Usage: node scripts/import-legacy-backup.mjs <path-to-backup.json> [--dry-run]');
  process.exit(1);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.');
  console.error('  source .env.local first, then export SUPABASE_SERVICE_ROLE_KEY yourself —');
  console.error('  never put the service-role key in a file that could get committed.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const backup = JSON.parse(readFileSync(filePath, 'utf8'));

// Accounts that already exist live under these exact names get their balance
// updated in place rather than being inserted as a duplicate — the household
// confirmed the export's balance is the one to trust for these two.
const MERGE_BY_NAME = ['BPI Savings', 'Maya'];

function warn(msg) {
  console.warn(`⚠️  ${msg}`);
}

async function main() {
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Importing ${filePath}`);
  console.log(
    `Source: ${backup.envelopes.length} envelopes, ${backup.transactions.length} transactions, ` +
      `${backup.income.length} income, ${backup.accounts.length} accounts, ${backup.goals.length} goals, ` +
      `${backup.ledger.length} ledger entries.`
  );

  const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id,display_name');
  if (profilesError) throw profilesError;
  const mommy = profiles.find((p) => p.display_name === 'Mommy Chelle');
  if (!mommy) throw new Error('Could not find a profile named "Mommy Chelle" — check the profiles table.');
  const attributedTo = mommy.id;
  console.log(`Historical rows will be attributed to: Mommy Chelle (${attributedTo})`);

  const { data: existingAccounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id,name,balance');
  if (accountsError) throw accountsError;

  // ---- 1. Accounts: split into "update existing" vs "insert new" ----
  const accountIdMap = {};
  const accountUpdates = [];
  const accountInserts = [];

  for (const acct of backup.accounts) {
    const existing = MERGE_BY_NAME.includes(acct.name)
      ? existingAccounts.find((a) => a.name === acct.name)
      : null;

    if (existing) {
      accountIdMap[acct.id] = existing.id;
      accountUpdates.push({
        id: existing.id,
        name: acct.name,
        oldBalance: Number(existing.balance),
        newBalance: acct.balance,
      });
    } else {
      const newId = randomUUID();
      accountIdMap[acct.id] = newId;
      accountInserts.push({
        id: newId,
        name: acct.name,
        type: acct.type,
        balance: acct.balance,
        currency: 'PHP',
        owner_id: attributedTo,
      });
    }
  }

  console.log(`\n--- Accounts ---`);
  for (const u of accountUpdates) {
    console.log(`  UPDATE "${u.name}": balance ${u.oldBalance} -> ${u.newBalance}`);
  }
  for (const i of accountInserts) {
    console.log(`  INSERT "${i.name}" (${i.type}, ${i.currency}): balance ${i.balance}`);
  }

  // ---- 2. Envelopes: all new ----
  const envelopeIdMap = {};
  const envelopeInserts = backup.envelopes.map((env) => {
    const newId = randomUUID();
    envelopeIdMap[env.id] = newId;
    return {
      id: newId,
      name: env.name,
      monthly_budget: env.monthlyBudget,
      group_name: env.group,
      created_by: attributedTo,
    };
  });
  console.log(`\n--- Envelopes: ${envelopeInserts.length} to insert ---`);

  // ---- 3. Goals: all new ----
  const goalInserts = backup.goals.map((g) => ({
    id: randomUUID(),
    name: g.name,
    target: g.target,
    saved: g.saved ?? 0,
    created_by: attributedTo,
  }));
  console.log(`--- Goals: ${goalInserts.length} to insert ---`);

  // ---- 4. Transactions: remap categoryId/accountId ----
  let unresolvedRefs = 0;
  const transactionInserts = backup.transactions.map((t) => {
    const categoryId = t.categoryId ? envelopeIdMap[t.categoryId] ?? null : null;
    const accountId = t.accountId ? accountIdMap[t.accountId] ?? null : null;
    if (t.categoryId && !categoryId) {
      warn(`Transaction ${t.id}: envelope "${t.categoryId}" not found, filing as uncategorized.`);
      unresolvedRefs++;
    }
    if (t.accountId && !accountId) {
      warn(`Transaction ${t.id}: account "${t.accountId}" not found, leaving unlinked.`);
      unresolvedRefs++;
    }
    return {
      id: randomUUID(),
      date: t.date,
      amount: t.amount,
      note: t.note || null,
      category_id: categoryId,
      account_id: accountId,
      created_by: attributedTo,
    };
  });
  console.log(`--- Transactions: ${transactionInserts.length} to insert ---`);

  // ---- 5. Income ----
  const incomeInserts = backup.income.map((entry) => ({
    id: randomUUID(),
    date: entry.date,
    source: entry.source,
    amount: entry.amount,
    account_id: entry.accountId ? accountIdMap[entry.accountId] ?? null : null,
    budget_month_key: entry.budgetMonthKey,
    created_by: attributedTo,
  }));
  console.log(`--- Income: ${incomeInserts.length} to insert ---`);

  // ---- 6. Ledger ----
  const ledgerInserts = backup.ledger.map((entry) => ({
    id: randomUUID(),
    date: entry.date,
    domain: entry.domain,
    type: entry.type,
    name: entry.name,
    amount: entry.amount,
    created_by: attributedTo,
  }));
  console.log(`--- Ledger: ${ledgerInserts.length} to insert ---`);

  console.log(`\nSample remapped transactions:`);
  for (const t of transactionInserts.slice(0, 3)) {
    console.log(`  ${t.date}  ${t.note ?? '(no note)'}  amount=${t.amount}  category=${t.category_id}  account=${t.account_id}`);
  }

  if (unresolvedRefs > 0) {
    warn(`${unresolvedRefs} reference(s) could not be resolved — review the warnings above.`);
  }

  if (dryRun) {
    console.log(`\n[DRY RUN] No changes written. Re-run without --dry-run to apply.`);
    return;
  }

  console.log(`\nWriting changes...`);

  for (const u of accountUpdates) {
    const { error } = await supabase.from('accounts').update({ balance: u.newBalance }).eq('id', u.id);
    if (error) throw error;
  }
  if (accountInserts.length > 0) {
    const { error } = await supabase.from('accounts').insert(accountInserts);
    if (error) throw error;
  }
  if (envelopeInserts.length > 0) {
    const { error } = await supabase.from('envelopes').insert(envelopeInserts);
    if (error) throw error;
  }
  if (goalInserts.length > 0) {
    const { error } = await supabase.from('goals').insert(goalInserts);
    if (error) throw error;
  }
  if (transactionInserts.length > 0) {
    const { error } = await supabase.from('transactions').insert(transactionInserts);
    if (error) throw error;
  }
  if (incomeInserts.length > 0) {
    const { error } = await supabase.from('income').insert(incomeInserts);
    if (error) throw error;
  }
  if (ledgerInserts.length > 0) {
    const { error } = await supabase.from('ledger').insert(ledgerInserts);
    if (error) throw error;
  }

  console.log(`\nDone. Row counts written:`);
  console.log(`  accounts updated: ${accountUpdates.length}, inserted: ${accountInserts.length}`);
  console.log(`  envelopes: ${envelopeInserts.length}`);
  console.log(`  goals: ${goalInserts.length}`);
  console.log(`  transactions: ${transactionInserts.length}`);
  console.log(`  income: ${incomeInserts.length}`);
  console.log(`  ledger: ${ledgerInserts.length}`);
}

main().catch((err) => {
  console.error('\nImport failed:', err);
  process.exit(1);
});
