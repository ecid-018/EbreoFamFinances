#!/usr/bin/env node
// Read-only snapshot of every table, written to a JSON file OUTSIDE the repo.
//
// The Supabase free plan has no scheduled/on-demand project backups, so this
// is how you take one before applying a migration. It only ever SELECTs.
//
// Usage:
//   source .env.local            # for VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
//   node scripts/backup-snapshot.mjs --email you@example.com
//     ...then type your PIN when prompted (it is not echoed or stored).
//
//   # or, with the service-role key instead of signing in:
//   SUPABASE_SERVICE_ROLE_KEY=<paste> node scripts/backup-snapshot.mjs
//
// Options:
//   --out <dir>   where to write (default: ~/ebreo-backups)
//
// The output contains the household's full financial history in clear text.
// It is written outside the repo on purpose — never move it into the project
// directory, which is a public git repository.
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const TABLES = ['profiles', 'envelopes', 'accounts', 'transactions', 'income', 'goals', 'ledger', 'transfers'];

const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : undefined;
};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = argValue('--email');
const outDir = argValue('--out') ?? join(homedir(), 'ebreo-backups');

if (!SUPABASE_URL || (!ANON_KEY && !SERVICE_ROLE_KEY)) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — run `source .env.local` first.');
  process.exit(1);
}
if (!SERVICE_ROLE_KEY && !email) {
  console.error('Pass --email <your sign-in email>, or set SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    let done = false;
    // Input can arrive a keystroke at a time (a real terminal) or as one whole
    // chunk (piped/CI), so walk the chunk character by character.
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (done) return;
        if (ch === '\r' || ch === '\n' || ch === '\u0004') {
          done = true;
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (ch === '\u0003') {
          process.stdout.write('\n');
          process.exit(130);
        } else if (ch === '\u007f') {
          value = value.slice(0, -1);
        } else {
          value += ch;
        }
      }
    };
    stdin.on('data', onData);
  });
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY ?? ANON_KEY);

if (!SERVICE_ROLE_KEY) {
  const pin = await promptHidden(`PIN for ${email}: `);
  const { error } = await supabase.auth.signInWithPassword({ email, password: pin });
  if (error) {
    console.error(`Sign-in failed: ${error.message}`);
    process.exit(1);
  }
}

const snapshot = {
  version: 2,
  takenAt: new Date().toISOString(),
  source: SUPABASE_URL,
  tables: {},
};

let total = 0;
for (const table of TABLES) {
  const { data, error } = await supabase.from(table).select('*');
  if (error) {
    console.error(`Failed reading ${table}: ${error.message}`);
    process.exit(1);
  }
  snapshot.tables[table] = data;
  total += data.length;
  console.log(`  ${table.padEnd(13)} ${String(data.length).padStart(5)} rows`);
}

mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outPath = join(outDir, `ebreo-snapshot-${stamp}.json`);
writeFileSync(outPath, JSON.stringify(snapshot, null, 2));

console.log(`\n${total} rows across ${TABLES.length} tables`);
console.log(`Written to ${outPath}`);
console.log('Keep this file out of the repo — it holds the full financial history in clear text.');
