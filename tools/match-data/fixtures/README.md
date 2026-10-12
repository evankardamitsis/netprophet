# Match data fixtures

Real organiser files used as test fixtures for `packages/ingest` (see `docs/v2/match-data-automation.md`).

Waiting for:
- the TAF RACE 2026-2027 order-of-play sheet (54 matches), exported per tab as CSV
- `parse_oop.py`, the reference parser the TypeScript port follows

Until they arrive, the parser is written from the spec's own examples. Parser changes must keep passing every
file here once it exists.
