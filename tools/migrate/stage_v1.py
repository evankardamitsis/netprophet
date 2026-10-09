#!/usr/bin/env python3
"""Build a staging SQL file from a v1 backup (scripts/v1-backup.sh output).

Reads schema.sql and data.sql from the backup folder and writes SQL that recreates only the tables the
v2 import needs, in schema `v1`, with their data. Generated columns, defaults that call v1 functions and
CHECK constraints are dropped: staging only holds the rows. Output goes to stdout.

    python3 tools/migrate/stage_v1.py ~/netprophet-backups/v1-<date> > /tmp/v1_stage.sql
"""
import re
import sys
from pathlib import Path

TABLES = ["players", "tournaments", "tournament_categories", "matches", "match_results"]
TYPES = ["match_round", "match_type"]


def main(folder: str) -> None:
    root = Path(folder).expanduser()
    schema = (root / "schema.sql").read_text(encoding="utf-8")
    data = (root / "data.sql").read_text(encoding="utf-8")
    out = ["drop schema if exists v1 cascade;", "create schema v1;"]

    for t in TYPES:
        m = re.search(r'CREATE TYPE "public"\."%s" AS ENUM \((.*?)\);' % t, schema, re.S)
        if not m:
            sys.exit(f"type {t} not found")
        out.append(f"create type v1.{t} as enum ({m.group(1).strip()});")

    for t in TABLES:
        m = re.search(r'CREATE TABLE IF NOT EXISTS "public"\."%s" \((.*?)\n\);' % t, schema, re.S)
        if not m:
            sys.exit(f"table {t} not found")
        cols = []
        for line in m.group(1).split("\n"):
            line = line.strip().rstrip(",")
            if not line or line.startswith("CONSTRAINT") or "GENERATED ALWAYS" in line:
                continue
            line = re.sub(r"\s+DEFAULT .*?(?= NOT NULL|$)", "", line)
            line = line.replace('"public".', "v1.")
            cols.append("  " + line)
        out.append(f"create table v1.{t} (\n" + ",\n".join(cols) + "\n);")

    for t in TABLES:
        m = re.search(r'COPY "public"\."%s" \((.*?)\) FROM stdin;\n(.*?)\n\\\.\n' % t, data, re.S)
        if not m:
            out.append(f"-- no rows for {t}")
            continue
        out.append(f"COPY v1.{t} ({m.group(1)}) FROM stdin;\n{m.group(2)}\n\\.")

    print("\n\n".join(out))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
