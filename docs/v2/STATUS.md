# v2 status and handoff

Last updated: 12 Oct 2026. Read this after CLAUDE.md. It says what is done, what is left of M0, and what M1 is.

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

Decided 9 Oct: «Άλλη φορά» stays and skips onboarding (still asks for the email code); v1 capital surnames get an accent pass with admin approval (queued, after the admin desk); the results desk lives in apps/admin.

Phone testing: `apps/app/.env.local` points at the hosted project by default (Expo Go, same Wi-Fi). For the local stack use the values from `scripts/v2-db-remote.sh start`.

Decided 10 Oct: «Άλλη φορά» is a testing shortcut. In development builds it enters without an account on the sample data (#16); it goes before launch.

## M1 progress (10 Oct)
- Merged: result cards with the prototype sequence and the outbox worker (pg_cron `np-process-outbox`, every minute, live on hosted); admin results desk at `/v2/results` in apps/admin; doubles layout; ink tab bar; publishable key instead of the legacy anon key; iOS crash after sign-in fixed (worklet); welcome fits iOS.
- Logo: «the net» chosen; files and rules in `brand/logo/` (explorations: https://claude.ai/artifact/MgaqRSkhaQAuMvVwZa9RXc).
- #12 to #17 merged 11 Oct (logo in the app, fold timing, sign-in error, bouncing logo, dev guest, Αποτελέσματα); `get_results` is live on hosted.
- Αποτελέσματα: `api.get_results` (scoreboard of the last 14 days, split, upset by the resolver's rule, the viewer's own vote only) and the screen; names show the surname large and the first initial (founder). Reactions, kudos, filter and the sponsored card are later.
- Παίκτες: `get_players_home`, `find_players`, `get_player` and the tab + profile from the prototype. Follow from the profile is a friend (relation 'friend'); onboarding's «Ποιους ξέρεις» will use 'known'. Traits («Πώς παίζει»), head-to-head and gifts are later. Hosted needs `scripts/v2-db-remote.sh push` after merge.
- Testing: iOS Simulator works (Xcode installed; iPhone 18 Pro). Android Studio still to install. `preview` is a local branch combining open PRs for the founder's phone; new work is built in a second clone (`../netprophet-dev`; worktrees there get cleaned up) so the main folder stays on `v2`.
- Lessons: on iOS, text clips when its line height is below its font size (accents, digits); any function called inside an animated style must be a worklet.

## M1 progress (12 Oct): the M1 list is built
- #18 to #31 merged and live on hosted: Παίκτες, onboarding (name, claim, how you play, area, who you know, 4 slides, «Ας ξεκινήσουμε»), Κατάταξη (`get_ladder`, two scopes; leagues are M3), Εγώ (`get_me_page`), Pro foundations + scouting + «Πού κερδίζεις», the import desk (`/v2/import`, `packages/ingest` = the parse_oop.py port, 54/54 on the TAF fixture), push for results (`core.push_tokens`, `core.send_push` with pg_net under pg_cron), PostHog analytics.
- Accounts: Expo project `@evankardamitsis/netprophet` (eas init, projectId in app.json). PostHog Cloud EU project «NetProphet» (key in `apps/app/.env.local`, sends only from release builds).
- Founder answers (12 Oct): «wo» winner is picked by the admin; the organiser's score always overrides; imported players show by name before a claim; «Πάμε» on the last slide; «δεξί χέρι»; no month-end line on Κατάταξη; surface comes per tournament.
- Before the closed beta: deploy the web app (`apps/app/vercel.json`, a new Vercel project rooted at `apps/app` with the EXPO_PUBLIC_ env values; add its URL to Supabase auth redirect URLs), development builds for push (Apple Developer account for APNs, a Firebase project for Android), the first real import (TAF), a web consent banner for the public launch.
- Lessons: the admin had no type-check script, so the pre-commit check skipped it (fixed in #30); `expo install` in this monorepo updates the lockfile but not `apps/app/package.json` (add the entries by hand); a broken `unrs-resolver` postinstall needs `pnpm install --ignore-scripts` locally.

## M2 (started 12 Oct)
- Founder decisions: player-logged results resolve votes at once (a dispute undoes them); player-logged matches show without approval; minors hidden from votes, cards and public pages, sign-up under 15 blocked; a new opponent name creates a pending player.
- Part 1, «+ Ματς» (`api.log_match`, `api.find_my_matches`, `api.list_tournaments`, `core.set_result`): played or coming up, «Αυτό είναι το ματς σου;» attaches a result to an existing match so its votes pay out. Player-logged results know only the sets (`match_results.sets_won/sets_lost`). A logger without a player gets a pending one from their profile. Known gap: «Πού κερδίζεις» and scouting count deciding sets from game scores, so sets-only 2-1 results are not counted as deciding yet.
- Part 2, confirmations in the feed (`api.get_confirmations`, `api.answer_confirmation`, `core.dispute_match`): «Έγινε έτσι;» card; a same-winner fix corrects the sets, another winner or «Δεν έπαιξα εγώ» disputes the match and takes its points back with correction rows (σερί untouched).
- Part 3, the opponent link `/m/<token>` (`api.match_links`, `get_match_link`, `answer_link`, `link_kudo`, `hide_via_link`, `claim_via_link`): one link per opponent not in the app, open 7 days, only token hashes kept (a resend rotates the token). The Done screen of «+ Ματς» shares it (WhatsApp, Viber, Μήνυμα, Άλλο). No account needed to confirm, fix, dispute, say a good word or «Κρύψε με»; «Κράτα το ματς στο προφίλ σου» signs in and runs a two-step onboarding (claim, Ποιους ξέρεις with the logger picked). The link page lives in the app (`EXPO_PUBLIC_LINK_BASE` points it elsewhere); it moves to `apps/site` at cutover, with link previews. The good word is kept on the link until kudos land (part 4).
- Local DB tests: Postgres 17 from Homebrew plus pgTAP built from source; run `scripts/v2-db-test.sh` with `V2_DB_MODE=url` against it before pushing.
- Part 4, kudos and reactions (`api.kudos_options`, `give_kudo`, `react`, `get_my_kudos`; `get_results` adds `reactions` and `kudo_to`): «Πες μια καλή κουβέντα» after logging a played match (five lines from the prototype's 35-line pool, by the opponent's gender, plural and doubles-only lines in doubles); «Πες κάτι στον …» on Αποτελέσματα for an opponent you have not thanked or a player you follow; two reaction chips per result; «Τι λένε για σένα» on Εγώ. The link's good word becomes a kudo when that person joins. No kudos for hidden players or minors. **Guess for the founder to confirm:** which two reactions a result shows (player-logged: Μπράβο / Ρεβάνς; 2-0: Πάμε / Περίπατος; otherwise Τι ματς / Κρίμα). Reactions and kudos show for everyone now; the unlock ladder gating waits for M3.
- Part 5a, the moderation queue (admin `/v2/moderation`; `api.admin_moderation`, `admin_resolve_dispute`, `admin_decide_player`, `admin_tournament_suggestion`, `core.merge_player`): disputed matches are kept (points come back), turned round (votes flip, the new right calls get the base points, no chain or upset) or voided; new players are approved (spelling fixable) or merged into the roster player (matches, confirmations, follows, kudos, links, traits, gifts and a claim move; the old spelling becomes an import alias); «Άλλο» tournament names are linked to a tournament or kept as friendlies. A decision writes `admin_adjust` rows because the dispute used each person's one `correction` row for the match. σερί is never rewritten.
- Part 5b, report and block (App Store 1.2; `core.reports`, `core.blocks`, `api.report`, `block`, `block_target`, `unblock`, `get_blocks`, `admin_close_report`): long-press a match or result card, or «Αναφορά» on a player profile, opens «Τι συμβαίνει;» (reasons, optional note) with «Μπλοκ τον …» for the person behind it. Blocking hides the matches they log (feed, Αποτελέσματα) and their kudos, and stops new kudos from them; confirmations still arrive so you can dispute. Unblock from Εγώ › Ρυθμίσεις. Reports join the moderation queue (hide it, or dismiss). Not in the prototype; the sheet follows the share sheet's look.
- Part 5c, minors and roster tools (`20261120000000_m2_roster_minors.sql`; admin `/v2/players`): a birth year under 18 makes a player a minor (staff can also flag one without a birth year). Minors are never voted on (`cast_vote` refuses, the feed and Αποτελέσματα leave their matches out) and never on cards (Παίκτες, search, profiles, the roster view). Sign-up asks «Είμαι 15 χρονών και πάνω» on the first onboarding step (and on the link claim step); it is a self-declaration stored as `onboarding_state.age_15`. Roster tools: search everyone with filters (new, minors, hidden, with an account), fix names, gender, birth year, hide, merge duplicates, release a claim.
- M2 is code-complete. Left for the founder: confirm the reaction pairs, check /v2/moderation and /v2/players on the admin preview.

## M3 (started 12 Oct)
- Order: level algorithm, celebrations (σερί milestones, free freezes), Αποστολές, badges, unlock ladder, leagues and month close, «Οι 6 της ημέρας», traits, Εγώ avatar and stats.
- Part 1, level algorithm v1 (`docs/v2/level-algorithm.md`; `packages/core/src/rules/level.ts` and `core.level_compute`, both on `test-vectors/levels.json`; `core.recompute_levels` nightly at 00:30 UTC; `api.admin_recompute_levels` behind «Recompute levels» on /v2/players). NTRP start values, Elo-style moves on counting matches (falling K, 2-1 worth 0.85), the accuracy-weighted crowd at a quarter weight, pending until 3 matches or 10 votes, direction against a week ago, one snapshot a day. Founder decisions recorded in the spec (halves, never rounded up; every win counts the same; crowd weight still open).
- Part 2, celebrations (`20261122000000_m3_celebrations.sql`; `Celebration.tsx`): each σερί milestone (3, 5, 7, 10) plays the prototype's full-screen moment after the result cards, waiting for «Συνέχεια». σερί 7 gives Frame «Επτά», σερί 10 Frame «Δέκα» (once each); σερί 3 the first free freeze (core rules). The reward line names only what was given. **To confirm with the founder:** the spec's «σερί 10 … a free freeze path» is read as the existing every-15-votes freeze, so no extra freeze at 10.
- Part 3, Αποστολές (`20261127000000_m3_quests.sql`; `QuestsSheet.tsx`, `QuestBar.tsx`): three daily quests and two weekly ones from the prototype, counted by triggers on votes, kudos and matches the player logs. `core.quest_apply` mirrors `applyQuestEvent` on the shared vectors, and the quest table equals `packages/core` (`test-vectors/quest-defs.json`). A finished quest gives the first frame or background not owned yet (Φόντο Βραδινό ματς, then Χωμάτινο γήπεδο; Frame Της εβδομάδας; Φόντο Γρασίδι), else a badge bonus kept on the progress row for badges to add. Each one queues a celebration (the σερί moment without the pill, several grouped into one); after a vote the slim bar shows progress, or a toast «Αποστολή ✓ · …» when one finishes. Εγώ has «Αποστολές N/3 ›». Shown to everyone until the unlock ladder exists. «Φέρε έναν φίλο» is defined but inactive until invites exist.
- Part 4, badges (`20261128000000_m3_badges.sql`; Εγώ card, `app/(tabs)/badges.tsx`): 16 badges × 3 tiers (Χάλκινο, Ασημένιο, Χρυσό), ids as in `core.badge_defs` (packages/core renamed to match; `test-vectors/badge-defs.json` and `badges.json` keep both sides equal). `core.badges_refresh` recomputes counters from the facts plus quest badge bonuses, on every vote, resolution, kudos, confirmation, result and σερί record, and nightly for the week badges. A new tier queues «Νέο badge» / «Νέα βαθμίδα» with its dots; Χρυσό gives Frame Level. A tier is never taken back. Four badges can be worn on the card (`api.wear_badge`). The first fill was quiet (no celebrations for what people already had). Not counted yet, their features missing: Ινφλουένσερ, Χουβαρντάς, Βετεράνος σεζόν, Κορυφαίος του μήνα. Shown to everyone until the unlock ladder exists.
- Part 5, the unlock ladder (`20261129000000_m3_unlocks.sql`; `lib/unlocks.tsx`, `lib/unlockLadder.ts`): the 13 steps of `UNLOCK_STEPS` (`unlock-defs.json` and the 18 `unlocks.json` vectors keep TS and SQL equal). `core.unlocks_refresh` evaluates from the facts at the badge moments; an active day is the core rule (3 votes or a logged match). New steps with something to show queue the prototype's «Νέο» moment; day1, first_freeze, bridge_line, weekly_quests stay quiet, and so do avatar_profile and gifts until their screens exist. The app hides what is not open yet (level box, Αποστολές, Κατάταξη tab, kudos and reactions, badges, Pro, «Όλη η Αττική»). Every account that existed at migration has all 13 steps; new accounts start on step 1. Dev builds: «Νέος παίκτης» on Εγώ walks the ladder as a guest. **To confirm with the founder:** the backup vote counts for steps 2 to 9, 11 and 12 (developer-chosen), and «Ανέβηκες level!» as the level step's line.
- Ads: sponsored cards are banners (`20261126000000_ad_banners.sql`): `image_url` for a sponsor's own banner, else one of five drawn scenes (`art`). The demo ads use the drawn ones.

## Pro: real, not a fake door (decided 12 Oct 2026)
- The founder dropped the fake door: Pro is built for real and sold on the web first (Apple/Google billing comes with the store release). Pro belongs to the account, so a web purchase unlocks the phone apps.
- Pro at launch: «Τα τουρνουά σου», «Ο αντίπαλος πριν το ματς», «Πού κερδίζεις, πού χάνεις», «Τα νούμερα του level σου». 8,99€ a month.
- Order: foundations (is_pro, get_pro, waitlist, staff grant, Pro screen) → scouting → πού κερδίζεις → level numbers → web checkout + webhook → tournaments.
- Blocked on the founder: a payment provider account (merchant of record or Stripe, an accountant's call for Greek receipts), the web app's domain for checkout, and `parse_oop.py` + the TAF sheet for tournaments. Level numbers show nothing until the M3 level algorithm runs (levels are null on hosted; v1 NTRP is only `initial_level`).
- Until checkout is live «Γίνε μέλος» puts you on the list (`entitlements.source = 'waitlist'`), which grants nothing.

## Queued phases
- **Match data automation** (after the admin desk): spec in `docs/v2/match-data-automation.md`. Port `parse_oop.py` to TypeScript, keep the TAF RACE sheet as a test fixture, build order step 1 first (tournaments page, Google Sheets adapter, records sheet writer). Ask the founder the open questions before dedupe and results logic. **Waiting for `parse_oop.py` and the TAF sheet** (not in the repo yet; put them in `tools/match-data/fixtures/`).
- **v1 names accent pass**: propose accented spellings for the 1,611 capital surnames, admin approves in bulk.

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
