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

## Left from M0 (do first)
1. Founder creates Supabase project `netprophet-v2` (Frankfurt). Then: link with the CLI, `supabase db push` the `supabase-v2` migrations, run the pgTAP suite against it, fix anything the stubs hid. Secrets live in GitHub Actions secrets and local `.env` (never committed).
2. Backup of the v1 Supabase database (full dump incl. auth users) before the founder pauses v1. Store outside git.
3. Auth in the app: email OTP, Google (Apple later, needs a developer account).
4. Wire `apps/app` to the real database through `@netprophet/db` (feed from `get_feed`, vote via `cast_vote`). Replace mocks in `apps/app/src/mock/`.
5. Run the app on a real phone (Expo Go / dev build) and on a low-end Android: animation spike sign-off by the founder.
6. Confirm the first CI run is green.
7. Known gaps: `pnpm install` needed `--ignore-scripts` in the cloud container (unrs-resolver); verify locally. Toolchain upgrades (pnpm 9, turbo 2) deferred.

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
