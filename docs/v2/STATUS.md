# v2 status and handoff

Last updated: 9 Oct 2026. Read this after CLAUDE.md. It says what is done, what is left of M0, and what M1 is.

## Done (M0, on branch `v2`)
- CLAUDE.md with v2 rules and founder decisions. Plans in `docs/v2/`.
- CI workflow `.github/workflows/v2.yml` (lint, type-check, test for v2 packages; `db` job runs `scripts/v2-db-test.sh`). Not yet seen green on GitHub: check the first run and fix.
- `packages/core`: all game rules (points, σερί, freezes, quests, badges, unlock ladder, monthly Ladder and leagues, Pro entitlements, tennis adapter). 203 tests, shared JSON vectors in `packages/core/test-vectors/`. README lists "Decisions to confirm".
- `packages/copy` (el/en, Greek helpers, `greekCaps`), `packages/tokens` (colors, motion), `packages/db` (types + client).
- `supabase-v2/`: 44 tables in `core` schema, views and RPCs in `api` (cast_vote, resolve_match, get_feed, get_me, admin_set_result, search/claim/follow...). RLS everywhere. Seed. 286 pgTAP assertions incl. a parity test that runs the core vectors against SQL. Run: `scripts/v2-db-test.sh` (see `supabase-v2/README.md`). Only tested on local Postgres 16 with auth/storage stubs, never on real Supabase.
- `apps/app`: Expo SDK 57, expo-router, 5 Greek tabs, header (σερί, πόντοι), «+ Ματς» modal, `VoteCard` with Reanimated on mock data. `expo export -p web` works. Never run on a device.
- `supabase-v2/migration-from-v1.md`: v1 to v2 data mapping (roster, users, claims, tournaments, matches, results; all coins dropped).

## Where M0 stands (9 Oct, branch `v2-app-auth-feed`, PR #2 on top of #1)
1. Done: hosted project `netprophet-v2` (ref `mssedfnhcozeifgflkaq`, Ireland). Migrations pushed; Data API exposes only `api`; 6-digit email code; all auth email through Resend SMTP from noreply@netprophetapp.com (`scripts/v2-project-settings.sh`). Checked end to end.
2. Done: v1 backup in `~/netprophet-backups/v1-20261009-*`. Storage bucket files not included.
3. Done: email code sign-in. Google is written but unverified (needs client id/secret). Apple later.
4. Done: app on real data (feed, vote, header). Screens copied from the prototype: welcome, header with the πόντοι shine, feed card, tab bar, «+ Ματς». Sign-in steps use the claim screen style (founder review).
5. Open: run on a real phone and a low-end Android; animation sign-off; check the native shine.
6. Done: CI green. 7. Done: local install.

Data on the hosted project (`tools/migrate/`, `supabase-v2/migration-from-v1.md` section 4):
- v1 roster 1,632 players (NTRP as initial level), 157 accounts with Google identities, profiles, 3 admins, 37 claims, 15 creation requests waiting.
- 3 tournaments and a test sample of 19 past results (the other 324 come at cutover with `-v sample=0`).
- 10 upcoming demo matches, flagged `source_ref 'demo:%'` / `provenance.demo`. Clear before launch: `tools/demo/clear_demo.sql`.
- No coins, bets or v1 points carried over.

Open questions for the founder: «Άλλη φορά» on welcome; capital, unaccented surnames from v1 (1,611); Greek drafts listed in PR #2.

## M1: core loop and first real users (next)
See `implementation-plan.md` section 9. In short:
- Feed with match cards, one-tap vote, split, fold, «Μαθαίνεις απόψε».
- Admin results desk; resolver + points ledger + σερί; result cards return to the top of the feed with the success/fail sequence and points/σερί flying into the header.
- Αποτελέσματα, Παίκτες search + profile + follow, onboarding (welcome, claim, area, Ποιους ξέρεις, 3 slides).
- Pro fake door («Γίνε μέλος» at 8,99€ → «Είσαι στη λίστα»).
- Basic admin CSV/Sheet import, push for results, analytics.
- Exit: closed beta with 50 to 100 roster players on the web build + TestFlight, real matches fed by admins for 2+ weeks.

The prototype (design reference for every screen, animation and Greek string) is the claude.ai artifact https://claude.ai/artifact/7weesnGwRGMbVddV78iYnr, file `V2.dc.html`. The founder can share screenshots if it is not reachable.

## Rule choices to confirm with the founder
Upset = winner had under 40% of at least 10 votes, pays +30 instead of +10. Chain bonus flat +5. Free freeze every 15 votes cast. No voting on your own match. A vote at exactly lock time is rejected. Resolved results cannot be corrected yet. Full list in `packages/core/README.md`.

## Working style
- The founder reviews Greek copy and design; never invent final Greek without flagging it.
- Small vertical slices on `v2-<area>-<short>` branches, merged into `v2` with CI green.
- Use subagents for independent work to save tokens.
