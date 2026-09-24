#!/usr/bin/env python3
"""Parse every .sql file with the real PostgreSQL grammar.

supabase/schema.sql is maintained BY HAND -- each migration's changes are
transcribed into it so the snapshot stays truthful. Nothing verified that
transcription, and it was silently broken for five migrations: the income
table lost a comma when 0007's `kind` column was copied across, so the file
could not create a fresh project at all. It went unnoticed because production
was built before 0007 and migrated incrementally ever since; the snapshot is
only executed when someone stands up a new project.

Run this after editing any SQL file:

    python3 -m venv /tmp/sqlcheck && /tmp/sqlcheck/bin/pip install pglast
    /tmp/sqlcheck/bin/python scripts/check-sql.py

It checks syntax only. A file can parse and still be wrong -- it will not
catch a missing table, a bad column reference or a broken policy.
"""
import glob
import io
import sys

from pglast import parse_sql
from pglast.parser import ParseError

failed = 0
for path in ['supabase/schema.sql'] + sorted(glob.glob('supabase/migrations/*.sql')):
    sql = io.open(path, encoding='utf-8').read()
    try:
        parse_sql(sql)
    except ParseError as exc:
        offset = getattr(exc, 'location', None)
        line = sql[:offset].count('\n') + 1 if isinstance(offset, int) and offset > 0 else '?'
        print(f'FAIL  {path}:{line}  {exc}')
        failed += 1

print(f'{failed} file(s) failed' if failed else 'All SQL files parse.')
sys.exit(1 if failed else 0)
