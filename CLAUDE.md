# NetProphet v2: project guide

Read `docs/v2/` first: `product-spec.md` (what), `implementation-plan.md` (how), `monetization-plan.md` (money).

## What v2 is
A voting and σερί (streak) game for amateur sport. Tennis first, built multi-sport-ready (nothing in core, copy or tokens may hardcode tennis). Players vote, see what happened, keep a streak, climb a Ladder, unlock levels. It is not betting.

## Branches
- `main` is v1 in production. Hotfixes only. Do not build v2 work on it.
- `v2` is long-lived and protected: PR only, squash merge, CI green.
- Feature branches: `v2/<area>-<short>`, e.g. `v2/feed-vote-card`. Off `v2`, short-lived (under 5 days), at most one migration file per PR.
- Merge `main` into `v2` weekly. At cutover `v2` merges to `main`.

## Layout (target)
```
apps/app        Expo universal app (iOS, Android, web). All product UI lives here.
apps/site       Next.js marketing and share/claim pages.
apps/admin      Next.js admin. Kept and adapted.
packages/core   Game rules + domain types. Pure TS, no IO.
packages/copy   el/en strings, Greek helpers.
packages/tokens Design tokens (TS constants + CSS vars).
packages/db     Supabase types and typed client.
packages/config eslint/prettier presets (kept).
supabase-v2/    The new database: migrations, pgTAP tests, edge functions.
docs/v2/        Spec, plan, monetization.
```
Legacy `apps/web`, `apps/mobile`, `packages/lib`, `packages/ui`, `supabase/` are v1. On v2 do not edit them. At cutover v1 is archived to a separate repo (never deleted outright). Only the data v2 needs migrates: roster (players), users/profiles and claims, tournaments, matches and results. All coins, bets and balances are dropped for everyone.

## Founder decisions (9 Oct 2026)
- Expo universal app. New Supabase project for v2 (credentials come from the founder when needed).
- Login: email OTP, Google, Apple.
- Match data ingestion from our sources is approved; no extra permission step.

## Design system
- Two surfaces: ink (`#0F2019`) and paper (`#F3F5EE`).
- Lime (`#D9F03F`) means "what happened" or earned. Nothing else is lime.
- Blue (`#2747E6`) is the single primary action on a screen. One per screen.
- Glyphs only: `↑ ↓ = ✓ + ‹ ›`. No icon sets, no emoji.
- Juicy micro-animations on every touch. Reveals 600 to 900ms (default 700), stagger 70ms. Celebrations last 3 to 4s and wait for «Συνέχεια».
- Uncluttered: one idea per screen. If in doubt, remove.
- Take values from `@netprophet/tokens`, never hardcode colors or durations.

## Greek copy rules
- Greek first. Spoken, playful, never translated-sounding. Write el first, then en.
- «level», never «επίπεδο».
- No betting vocabulary: no στοίχημα, απόδοση, ποντάρω, κέρδη.
- No em dashes anywhere (code, copy, docs, commits).
- No accents on all-caps Greek: use `greekCaps()` from `@netprophet/copy`, not `toUpperCase()`.
- «Ladder», not λίγκα.
- Names go through the helpers in `packages/copy/src/greek.ts` (grammar, transliteration).

## Product rules
- Never sell advantage. Money never buys points, ranking or outcomes. Paid things are cosmetic, convenience or access only.
- All game logic is server-authoritative. Clients display; the database and edge functions decide points, streaks, quests, unlocks. `packages/core` is the single source of the rules and is used by both server and tests.
- Players pay. No dependency on clubs or organisers for data, distribution or revenue.

## Testing
- vitest for TS packages. `pnpm --filter "@netprophet/<pkg>" test`.
- `packages/core` rules need test vectors (input, expected) so the server implementation can be checked against the same cases.
- Database: pgTAP under `supabase-v2/tests` for RLS, idempotency and rule parity.
- New logic ships with tests in the same PR. Run lint, type-check and test for what you touched before pushing.
- Scoped installs work if legacy deps fail: `pnpm install --filter "@netprophet/core..."`.

## Commits
- Conventional Commits: `feat(core): ...`, `fix(copy): ...`, `chore: ...`, `docs: ...`.
- One PR per vertical slice (DB + API + UI), not per layer.
- No em dashes in messages.
- Do not commit secrets. `.env.example` lists names only; the service-role key never reaches a client.
