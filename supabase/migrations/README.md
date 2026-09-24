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

## How to apply

Nobody applies SQL from a script or from Claude Code. The owner applies each file by hand
in the Supabase dashboard's **SQL Editor**, in this order:

1. **Staging** — apply, then run the app's manual test script against staging.
2. **Production** — only after staging passed, and only after taking a backup
   (Dashboard → Database → Backups).

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
