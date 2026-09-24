# Database migrations

This folder is the ordered history of every schema change. `../schema.sql` is the
*current snapshot* (what a fresh project ends up with after applying everything here);
this folder is *how it got there*.

## Files

| File | Purpose |
|---|---|
| `0000_baseline.sql` | The schema as production had it before any numbered migration. **Fresh projects only — never run against production.** |
| `NNNN_description.sql` | One incremental, additive change. |
| `NNNN_description.rollback.sql` | Exactly reverses that one migration. Every migration ships with one. |

Rules for new migrations (from the Plan-layer build spec):

- **Additive only.** New tables; new columns that are nullable or have a default. No renames,
  no drops, no type changes. A `NOT NULL` column without a default breaks every existing
  insert path and every RPC.
- Money moves only through `SECURITY DEFINER` functions that append to `ledger` and set
  `updated_at = now()` explicitly (there are no triggers).
- New tables copy the existing RLS shape: `select using (true)`,
  `insert with check (created_by = auth.uid())`, `update`/`delete using (true)`, all
  `to authenticated`; nothing granted to `anon`.
- After writing a migration, update `../schema.sql` so the snapshot stays truthful.

## Numbering note (deviation from the build spec)

The spec numbers Phase 1's migration `0001_account_types_roles.sql`, but Phase 0 needed its
own migration for `accounts.archived_at`. That took `0001`, so **every later phase is
numbered +1 relative to the spec**:

| Spec says | Actual file |
|---|---|
| `0001_account_types_roles.sql` (Phase 1) | `0002_account_types_roles.sql` |
| `0002_goals_plan_fields.sql` (Phase 2) | `0003_goals_plan_fields.sql` |
| … | … |

## Every file starts with a project-check banner

Each `.sql` file in this folder opens with a banner telling you to check the project badge
before running it. That is deliberate and belongs in the **file**, not only in this README:
the SQL editor looks identical in staging and production, and by the time you are pasting,
this README is not on screen. The banner is.

New migrations copy the banner from the most recent file. Rollbacks get the stronger wording,
and `0000_baseline.sql` gets its own — it must never touch an existing project at all.

## Checking the SQL parses

`../schema.sql` is maintained by hand: every migration's changes are transcribed into it so the
snapshot stays truthful. Nothing verified that transcription, and it was silently broken for five
migrations — the `income` table lost a comma when `0007`'s `kind` column was copied across, so the
snapshot could not create a fresh project at all. Nobody noticed, because the snapshot is only ever
executed when standing up a NEW project.

After editing any SQL file here or the snapshot:

```sh
python3 -m venv /tmp/sqlcheck && /tmp/sqlcheck/bin/pip install pglast
/tmp/sqlcheck/bin/python scripts/check-sql.py
```

Syntax only. A file can parse and still be wrong.

## How to apply — the order, every time

Nobody applies SQL from a script or from Claude Code. The owner applies each file by hand in
the Supabase dashboard's **SQL Editor**.

**The order is always the same, and merging is always last:**

| # | Step | Why |
|---|---|---|
| 1 | Apply to **staging** | Nothing here has run anywhere yet. |
| 2 | **Test on staging** — the PR's probe and manual script | The only chance to be wrong for free. |
| 3 | Apply to **production** | Only after step 2 passed. |
| 4 | **Merge the PR** | Merging deploys. The database must be ready before the app that expects it. |

**A PR with no migration** (e.g. the 10a alerts) skips 1–3 entirely. Just merge.

### Why merge is last

Merging pushes to `main`, and Vercel deploys `main` automatically. So the moment a PR is
merged, the live app is the new code. If production has not been migrated yet, the new code is
talking to an old database.

How badly that goes depends on the change:

- **Usually it degrades quietly.** Every table added since `0004` is fetched behind a wrapper
  that catches "table does not exist" and returns nothing, and every new column is omitted from
  writes until it exists. The feature simply does not appear. This is deliberate, and it is why
  merging `0011` and `0012` early did no harm.
- **Sometimes it does not.** `0013` added a third payday kind. Merging that before production was
  migrated would have put a **Sign-off** button on screen that failed on a CHECK constraint every
  time it was pressed. Nothing would have been corrupted — it is one transaction — but it would
  have looked broken for no reason.

Rather than judging which case applies each time, keep the order fixed. It is never wrong.

### Why staging is not optional

Once a migration has been applied anywhere, its number is spent — see the numbering note above.
A mistake found on staging is fixed by editing the same file before it goes further. A mistake
found on production needs a whole new migration to correct, and lives in the history forever.

### Probes

A migration that adds or changes a `SECURITY DEFINER` function ships with a **probe**: a small
script in the PR that runs the function on staging and prints something that proves it worked.
Run it at step 2.

This exists because `apply_payday` shipped in Phase 5 having **never once been executed**, and the
first real call failed on an unqualified `DELETE` that Supabase refuses outright. Every money-moving
function since has been run before it was trusted.

Note that the Supabase SQL editor shows only the **last** statement's result. A probe that ends in
`rollback;` will report "Success. No rows returned" and hide the answer — so probes put the
interesting `select` last, or run as separate blocks.

### Backups

The README used to say "only after taking a backup". The Free plan has no backups, so on this
project that instruction was unachievable. Judge it per migration instead:

- A migration that only widens a constraint or adds a nullable column **cannot destroy data**.
  There is nothing for a backup to protect.
- A migration that creates tables, moves rows, or drops anything deserves a real backup first.
  `pg_dump` is the Free-tier answer.

Record what was applied where in the PR that introduced the migration.

## Verifying that production matches `schema.sql`

Run these in the SQL Editor (all read-only; nothing is modified) and compare against
`../schema.sql`:

```sql
-- Check constraints, foreign keys, primary keys
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
  from pg_constraint
 where connamespace = 'public'::regnamespace
 order by 1, 2;

-- Indexes
select tablename, indexname, indexdef
  from pg_indexes
 where schemaname = 'public'
 order by 1, 2;

-- Row Level Security policies (full text)
select tablename, policyname, cmd, roles, qual, with_check
  from pg_policies
 where schemaname = 'public'
 order by 1, 2;

-- Functions (all should be SECURITY DEFINER)
select proname, pg_get_function_identity_arguments(oid) as args, prosecdef as security_definer
  from pg_proc
 where pronamespace = 'public'::regnamespace
 order by 1;

-- Is RLS enabled on every table?
select relname, relrowsecurity
  from pg_class
 where relnamespace = 'public'::regnamespace and relkind = 'r'
 order by 1;
```
