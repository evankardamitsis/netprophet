# Match data fixtures

Real organiser files used as test fixtures for `packages/ingest` (see `docs/v2/match-data-automation.md`).
Parser changes must keep passing every file here.

## Contents

- `parse_oop.py`: the reference parser (Python, stdlib only) the TypeScript port follows.
  Run: `python3 -I parse_oop.py <input.txt> <outdir>` → writes `<outdir>/matches.csv`.
- `taf-race-2026-2027/`: TAF RACE 2026-2027 order-of-play Google Sheet (TAF Tennis Club Pallini).
  - `TAF_RACE_OOP_2026-2027.txt`: the original export, all 25 tabs, each starting with `## Sheet name: <tab>`.
  - `tabs/NN_<tab>.csv`: the same content split one CSV per tab. `tabs/manifest.json` maps each file to its
    original tab name (e.g. `ΤΡ 15/09`), which is where the date comes from.
  - `expected_matches.csv`: `parse_oop.py` output for this file, the golden result to compare against.

## What the TAF file covers

54 matches: 31 completed, 20 scheduled, 2 unfinished (`44 tbc`, `12 tbc`), 1 walkover (`wo`).

- Category spellings: `M MED/ADV`, `M MED ADV`, `M MED/ ADV`, `MED/ADV`, `M ROOK 2`, `M ROOKIES2`, Greek `Μ` in `Μ 40-49`.
- Score styles: `63 76`, `62 36 10 6`, `75 16 14-16`, `57 64 3-10`, `57-26`, `64-46 10-8`, `wo`, `44 tbc`.
- Blank time on a second match (inherits the row above), stray characters (`΄20:30`), `21.00` vs `21:00`.
- Doubles as surnames only (`ΠΑΠΑΖΟΓΛΟΥ/ΖΑΡΕΙΦΟΠΟΥΛΟΣ`), name order swapped between days
  (`ΕΜΜΑΝΟΥΗΛ ΟΡΕΣΤΗΣ` / `ΟΡΕΣΤΗΣ ΕΜΜΑΝΟΥΗΛ`), one Latin name (`PAVEN FLORIAN`).
- `ΠΕΜ 1/10` is a stale copy of `ΤΡ 15/09` (same match, same title row): possible duplicate.
- Tabs `ΤΡΙ 11/05`, `ΣΑΒ 17/04`, `ΚΥΡ 18/04`, `ΤΡΙΤ 20/04` belong to another venue
  (FERNANDEZ TENNIS ACADEMY ΠΙΚΕΡΜΙ), dates in spring 2027: import as a separate tournament.
- `ΗΛΙΑΔΗΣ v ΜΑΤΣΟΥΚΑΣ` appears on 2/10 with no score and again on 9/10: a moved match, not a second one.
- Weekday prefixes on every tab match their computed dates.
