# NetProphet v2: implementation plan

Status: planning only. Inputs: `product_spec.md` (prototype V2 v121), `monetization-plan.md` v3, an audit of `evankardamitsis/netprophet` main (shallow clone) and the `pivot/daily-run` branch. Date: 8 Oct 2026.

Founder decisions are marked **[DECIDE]**, each with a recommendation. Everything else is the default plan unless the founder objects.

### Repo facts verified for this plan
- Root `vercel.json` declares 5 crons (`/api/cron/match-automation`, `/api/cron/mailerlite/*`), but those routes live in `apps/admin/src/app/api/cron/`, not in `apps/web`. The cron config and the code are in different Vercel projects. `apps/web/vercel.json` and `apps/admin/vercel.json` both use `turbo-ignore`.
- There is no `.github/` directory, so there is no CI. `.husky/pre-commit` runs `pnpm lint && pnpm type-check` locally.
- Neither app has a `middleware.ts`, so there is no server-side session check.
- 10 edge functions send `Access-Control-Allow-Origin: *`, including `wallet-operations`, `match-automation` and `send-email`.
- The `athlete-photos` bucket lets **any authenticated user** upload, update and delete (migration `20251220170000`).
- Migrations: 262 base files in `backup/migrations-20251021-135848/` plus 129 patches in `supabase/migrations/`. PG17 (`supabase/config.toml`).
- `apps/mobile` is Expo 49 / RN 0.72 / expo-router 2. It is effectively dead and too old to upgrade in place.
- `apps/web` runs React 18.3 and Next 15.4. It already uses `framer-motion`, `zustand` and `react-query`.
- `apps/admin` runs Next 15 with Tailwind 4, Radix and shadcn.
- Remote branches: `main`, `develop`, `pivot/daily-run`, `feat/daily-run`, `feature/doubles`, `teams`, `athlete-photos`, `new-ui-test`, among others.
- `pivot/daily-run` (77 files, about 11.7k lines added) contains:
  - `apps/web/src/lib/daily/` with copy (`el.ts`/`en.ts`), `greek.ts` (Greek name grammar, with tests), card templates, generators, `validate.ts`, `scoring.ts` and vitest config
  - migrations `20260906090000_create_daily_cards.sql` and `20260906140000_guard_match_result_coherence.sql`

---

## 1. Branching and environments

### 1.1 Git strategy
| Branch | Purpose | Deploys to | Rules |
|---|---|---|---|
| `main` | v1 in production, untouched except hotfixes | current Vercel projects, current Supabase prod | PR only, CI green, 1 approval (or self-approval plus CI when solo) |
| `hotfix/*` | v1 fixes | merged to `main` | Cherry-pick into `v2` only if it touches code v2 keeps (player search, claim functions, email) |
| `v2` | long-lived integration branch for the new product | v2 dev environment (Vercel, Supabase dev, EAS `preview` channel) | Protected, PR only, squash merge, required checks: lint, types, tests, migration check |
| `v2/<area>-<short>` (e.g. `v2/feed-vote-card`) | feature branches off `v2` | Vercel preview URL per PR | Short-lived (under 5 days), one migration file per PR at most |
| `v2-release` (optional, from M6) | stabilisation before cutover | staging / TestFlight external | Fixes only |

Steps:
1. Tag `v1-final-baseline` on `main` now, and again as `v1-final` at cutover.
2. Create `v2` from `main`. In the first PR on `v2` (M0), cherry-pick these files from `pivot/daily-run` into the new package locations:
   - `greek.ts` and its tests
   - the copy modules
   - `validate.ts`
   - templates and generators
   - the coherence-trigger SQL
   - the daily_cards migration, as a reference for `quiz_cards`
3. Archive `pivot/daily-run`, `feat/daily-run`, `develop` and `new-ui-test` as tags (`archive/<name>`), then delete the branches. This stops people building on them.
4. Merge `main` into `v2` weekly, which is cheap because hotfixes are rare. That way the final `v2` to `main` PR at cutover is a plain merge. Most v1 code is deleted on `v2`, so conflicts resolve to "take v2".
5. Commit conventions: Conventional Commits, so release notes for the app stores can be generated. Use one PR per vertical slice (DB plus API plus UI), not per layer.

### 1.2 Environments
| Env | Supabase | Web (Vercel) | Native | Who |
|---|---|---|---|---|
| local | `supabase start` (Docker) from the squashed schema plus `seed.sql` | `pnpm dev` | Expo Go / dev client | devs |
| preview | shared **v2-dev** project (seeded with anonymised roster) | per-PR preview URLs | EAS Update `pr-<n>` channel | devs, founder |
| dev/staging | **v2-dev** project | `dev.netprophet.gr`, `app-dev.`, `admin-dev.` from branch `v2` | EAS `preview` channel, TestFlight internal, Play internal testing | founder, beta testers |
| v2 prod | **v2-prod** project (new, created at M5) | production domains after cutover | App Store / Play production | everyone |
| v1 prod | current project | current domains | none | existing users until cutover |

**[DECIDE] New Supabase project vs in-place schema.** Recommendation: **new projects (v2-dev now, v2-prod at M5) with a clean squashed schema.**
- The old migration chain cannot rebuild from `supabase/migrations/` alone. About 60% of the old tables are going away. An in-place `v2` schema would share auth, storage and cron with live v1 and make every v2 migration a production risk.
- Cost: one extra Pro project (about 25$/month) for the months before cutover. v2-dev can run on the free tier until beta (it pauses after a week idle, which is acceptable for dev).

### 1.3 Squashed baseline
- Do not try to replay 391 old files. Write `supabase/migrations/20261101000000_v2_baseline.sql` by hand from the v2 design in section 3. Copy in the reusable functions, re-reviewed: `find_matching_players`, `handle_player_claim`, the normalisation helpers, and the coherence trigger.
- Move `backup/` and the old `supabase/migrations/` to `supabase/legacy/` (never applied). Keep a `pg_dump --schema-only` of v1 prod in `supabase/legacy/v1_schema.sql` as the reference for the migration ETL.
- Regenerate `packages/db/types.ts` from the local DB in CI. The build fails if the committed types are stale.

### 1.4 Vercel, stores, secrets
Vercel:
- Create three new projects on the `v2` branch: `np-site`, `np-app-web` and `np-admin-v2`.
- Leave the old two on `main`.
- Delete the root `vercel.json` crons in v2. Scheduling moves to pg_cron and GitHub Actions (section 3.6).
- Commercial use needs **Vercel Pro** (20$/seat). One seat is enough.

Stores:
- Apple Developer (99$/yr) and Google Play (25$ once), under a company account if one exists, because the seller name shows on the store.
- Use TestFlight internal from M1, then TestFlight external (needs Beta App Review, about 1 day) for the beta cohort.
- Use Play internal testing, then closed testing. New personal Play accounts must run a 14-day closed test with 12+ testers before production, so start this by M3.

Secrets:
- Keep one `.env.example` per app, listing names only.
- Store values in Vercel env (per environment), EAS secrets, Supabase function secrets and GitHub Actions environments (`v2-dev`, `v2-prod` with required reviewer).
- Never ship the service-role key to any client. `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` carry only the publishable key (`sb_publishable_…`, which replaced the legacy anon key) and URLs.
- Rotate every v1 key that reaches v2 (Stripe, Resend, MailerLite) by issuing new restricted keys.

### 1.5 CI (GitHub Actions)
`.github/workflows/ci.yml` runs on every PR to `v2` and `main`:
1. Setup: `pnpm/action-setup` (pnpm 9) and Node 20 with cache.
2. Install: `pnpm install --frozen-lockfile`.
3. Lint, types and tests on affected packages only: `turbo run lint type-check test --filter=...[origin/v2]`.
4. **Migration check:**
   - `supabase start`, then `supabase db reset`, which applies the baseline plus all migrations from zero.
   - `supabase test db` runs the pgTAP suite: RLS tests, the resolution engine vectors and the idempotency tests.
   - `supabase gen types --local`, then diff against the committed types.
   - `supabase db lint`.
5. Edge functions: `deno check` and `deno test`.
6. Native app: `expo-doctor` and `tsc`.

Other workflows:
- `deploy-dev.yml` runs on push to `v2`:
  - `supabase db push` to v2-dev
  - `supabase functions deploy`
  - `eas update --channel preview`
- `deploy-prod.yml` is manual, gated by the protected environment.
- `ingest.yml` holds the scheduled scrapers (section 4.1).
- Add Renovate in weekly batches, and Sentry release upload.

---

## 2. Target architecture

### 2.1 Monorepo after the change
```
apps/
  app/        Expo (React Native) universal app: iOS, Android and web (app.netprophet.gr)
              (replaces apps/mobile; the product UI lives only here)
  site/       Next.js 15 marketing site + public share/claim landing pages + Stripe web checkout
              (renamed from apps/web, keeping the (marketing) route group; the (app) group is deleted)
  admin/      Next.js 15 admin (kept, Tailwind 4 + shadcn), adds middleware with role check
packages/
  core/       pure TS: domain types, zod schemas, rules engine (points, σερί, freezes, quests,
              badges, unlocks, ladder), feed composer, Greek grammar (from greek.ts), test vectors
  db/         generated Supabase types + typed query helpers (replaces packages/lib services)
  ui/         design tokens (ink/paper/lime/blue, type, spacing, motion springs/durations),
              Tailwind preset + NativeWind preset + CSS variables, glyph set
  copy/       el (primary) / en dictionaries, typed keys, gender/plural helpers, lint rule
              for banned betting words and accented capitals
  config/     eslint, tsconfig, prettier (kept)
supabase/
  migrations/ (v2 baseline + forward migrations)   functions/ (edge)   tests/ (pgTAP)
  legacy/     (v1 migrations and schema dump, never applied)
tools/ingest/ (scrapers, normalisers, sheet sync; Node, run by GitHub Actions)
```
Toolchain upgrades in M0:
- pnpm 8 to 9 and turbo 1 to 2 (`pipeline` becomes `tasks`).
- React 19 everywhere, because current Expo SDKs require it and Next 15 supports it.
- Put `node-linker=hoisted` in `.npmrc` if Metro needs it.
- `packages/lib`, with its tsup dist and odds code, is retired. Anything still useful moves to `core` or `db`.

**Website: separate app or keep the route group?** Recommendation: a separate `apps/site`.
- The product UI moves to Expo, so `apps/web` would otherwise be a marketing site carrying dead product code.
- The site needs SSR/SSG, OG images and SEO. The app needs none of these.
- Renaming `apps/web` to `apps/site` keeps git history and the working `/[lang]` dictionary setup.

### 2.2 The native decision
| Criterion | Expo / React Native (universal) | Capacitor-wrapped Next | PWA only |
|---|---|---|---|
| Juicy micro-animations | Best. Reanimated springs on the UI thread, gesture handler, haptics, Skia particles. 60fps on mid-range Android. | Good on iOS WKWebView, weaker on low-end Android WebView. framer-motion runs on the JS thread. | Same as Capacitor, without haptics on iOS. |
| Rive / 3D avatar | `rive-react-native` (native runtime). three.js via `@react-three/fiber/native` + expo-gl works but is heavy. | Rive web runtime and three.js work as-is (the prototype code ports directly). | Same as Capacitor. |
| IAP | RevenueCat `react-native-purchases`, mature. | RevenueCat Capacitor plugin exists, a smaller community. | **No IAP.** Stripe only, and there is no store presence. |
| Push | `expo-notifications` + Expo Push (free, wraps APNs/FCM). | Capacitor push plugin + FCM/APNs setup. | Web Push. iOS needs the PWA installed to the home screen, which kills it for this audience. |
| Code sharing | One product UI for iOS, Android and web (react-native-web). Site and admin share only core/copy/tokens. | 100% shared with web; one Next codebase. | 100%. |
| Team size and cost | One stack to learn (RN). EAS free tier covers early builds. Strong AI-assistant coverage. | Lowest learning curve for a web team, but native plugin debugging lands on the same 1 to 2 people. | Cheapest. |
| App Store review | Native app, low risk. | Guideline 4.2 ("minimum functionality / repackaged website") risk. Mitigated by push, IAP and haptics, but not zero. | Not in the stores. |
| Existing code reuse | Old UI is not reusable either way (the product is a rebuild from the prototype). | Old Next app shell reusable. | Same. |

**Recommendation: Expo universal app (React Native + Expo Router + EAS).**
- The core experience is animation-heavy:
  - chips flying into the header
  - count-ups
  - frost on a freeze
  - confetti
  - avatar celebrations
  - a stories-style quiz
- The business depends on IAP and push. Expo is the only option that is strong on all three and also gives a web build for the claim links and for desktop users.
- Capacitor is the fallback if the team turns out to be web-only. The decision gate is the M0 spike: build the vote card plus the result-card flight animation in Expo and check it on a 150€ Android phone.

Animation stack:
- Reanimated + Moti for springs and count-ups
- `expo-haptics`
- `@shopify/react-native-skia` for confetti and frost on native, with a lighter canvas fallback on web, because Skia web needs a ~3MB CanvasKit download
- Lottie is not needed

**[DECIDE] Avatar renderer.** Recommendation: **Rive**, decided by the end of M2.
- It has a native runtime on iOS/Android and a small web runtime.
- State machines suit "cheer" and "idle".
- Files are tiny compared with GLB plus three.js.
- The data model (kit, frame, background, hand, gender, equipped items) is renderer-agnostic, so the decision does not block M0 to M2.

### 2.3 How much UI is shared
| Layer | app (iOS/Android/web) | site | admin |
|---|---|---|---|
| Domain rules, types, schemas (`core`) | yes | yes (share pages) | yes (previews) |
| Copy (`copy`) | yes | yes | Greek labels for previews |
| Tokens (`ui`) | NativeWind preset | Tailwind preset | Tailwind preset (admin keeps the shadcn look) |
| Components | about 95% shared across iOS/Android/web, with `.web.tsx` overrides for Skia and the share sheet | own (React DOM) | own (shadcn) |

---

## 3. Database

### 3.1 Principles
- **Sport-generic:** every competitive entity carries `sport_id`. Sport-specific shape lives in `sports.config` jsonb:
  - side size (1 or 2)
  - score model (sets/games/tiebreak for tennis and padel, points/periods for basketball and football)
  - allowed formats
  - mixed rules
- A person (`players`) is sport-agnostic. Ratings, records and form are per `player_sports`.
- Two exposed layers:
  - Base tables live in the schema `core` (not exposed by PostgREST).
  - Clients read through views in `public` (`security_invoker`) and write only through RPCs or the `game` edge function.
- Time: every period key (day, ISO week, month) is computed in `Europe/Athens`.
- Money never writes to `points_ledger`. This is a DB-level check: no ledger reason references a purchase.

### 3.2 Tables (v2 baseline)
**Reference and identity**

| Table | Key columns |
|---|---|
| `sports` | id (`tennis`, `padel`, `basketball`, `football`), name_el/en, config jsonb, active |
| `regions`, `areas` | Βόρεια/Κέντρο/Νότια, then places. `areas.region_id`, geo point optional |
| `profiles` | user_id (= auth.uid), first_name, surname, display_name, gender, region_id, area_ids[], primary_sport, locale `el`, tz, hidden, onboarding_state jsonb, role (`user`/`admin`/`editor`), deleted_at |
| `players` | id, first_name, surname, name_forms jsonb (nominative, accusative, genitive, vocative, generated by `core/greek` and editable), search_norm (Greek plus Greeklish normalised), slug, gender, birth_year, is_minor, area_id, photo_path, claimed_by_user_id unique, hidden, source (`admin`/`import`/`user`), status (`pending`/`active`/`merged`), merged_into |
| `player_sports` | player_id, sport_id, hand, initial_level (admin, from NTRP), level_value numeric, level_tier, level_direction, level_status (`pending`/`active`), record jsonb (singles/doubles W-L), form jsonb (last 5), upset_index, updated_at |
| `player_aliases` | player_id, alias_norm, source (for ingestion matching) |
| `follows` | user_id, player_id, relation (`known`/`friend`), source (`onboarding`/`profile`/`card`/`invite`), created_at |
| `circle` (materialised, nightly plus on-write) | user_id, player_id, weight, reason (played with, known, opponent of known, area/level) |
| `blocks`, `reports` | needed for App Store UGC rule 1.2 (report and block) |

**Competition**

| Table | Key columns |
|---|---|
| `venues` | name, area_id |
| `organisers` | name, contact (for the later hosting-fee line) |
| `tournaments` | sport_id, organiser_id, name, area_id, level_min/max, entry_deadline, starts_on, ends_on, draw_state (`open`/`drawn`/`done`), draw_published_at, is_minor_event, source, external_ref |
| `tournament_events` | tournament_id, format, gender, level band (replaces `tournament_categories`) |
| `tournament_entries` | event_id, player_id (or pair via `entry_players`), status |
| `matches` | sport_id, format (`singles`/`doubles`/`mixed`), status (`announced`/`scheduled`/`played`/`confirmed`/`disputed`/`void`), starts_at, venue_id, area_id, tournament_id null = friendly, event_id, round, source (`admin`/`import`/`user`), source_ref unique (source, external_id), logged_by, announced_before_played, counts_for_levels, provenance jsonb (url, run_id, sheet row) |
| `match_sides` | match_id, side (1/2), player_id, position (doubles order) |
| `match_results` | match_id, winner_side, sets jsonb (winner-first games plus tiebreak points), super_tiebreak, retired, walkover, entered_by, entered_at. Coherence trigger ported from `pivot/daily-run` |
| `match_confirmations` | match_id, player_id, state (`pending`/`confirmed`/`disputed`/`not_me`), via (`feed`/`link`/`admin`), proposed_fix jsonb, at |
| `match_links` | match_id, token_hash, expires_at (at least 7 days), resend_count, opened_at, claimed_at |
| `h2h`, `partnerships` (views or materialised) | derived from results. The old triggers are replaced by nightly plus on-result refresh |

**Ingestion** (section 4.1)

| Table | Key columns |
|---|---|
| `ingest_sources` | key (`tennisleague_gr`, `athenstennis_gr`, `itf_mt`, `sheet_master`, `organiser_csv`), schedule, enabled |
| `ingest_runs` | source, started/finished, counts, error |
| `ingest_records` | run_id, raw jsonb, hash unique |
| `ingest_candidates` | normalised match/result/tournament, matched player ids with confidence, dedupe_match_id, status (`pending`/`auto_ok`/`approved`/`rejected`/`merged`), reviewer |

**Game**

| Table | Key columns |
|---|---|
| `votes` | user_id, subject_type (`match`/`card`), subject_id, option, client_event_id unique, created_at, resolved_at, outcome (`correct`/`wrong`/`none`), is_upset_call, points, day_key. Unique (user_id, subject_type, subject_id) |
| `vote_tallies` | subject_type, subject_id, option, count (trigger-maintained, used for splits) |
| `points_ledger` | user_id, delta, reason (`correct`/`upset`/`chain`/`daily_quiz`/`admin_adjust`), ref_type, ref_id, month_key, created_at. **Unique (user_id, reason, ref_type, ref_id)**, which gives idempotency |
| `user_game_state` | user_id, total_points, streak, streak_best, chain, votes_cast, votes_correct, active_days, last_active_day, votes_since_free_freeze, first_free_at3_done, version (optimistic lock) |
| `freezes` | user_id, kind (`free`/`paid`), source (`streak3`/`every15`/`purchase`/`gift`), purchase_id, acquired_at, used_at, used_on_vote_id. Max 2 unused, enforced in the engine plus a partial-index check |
| `streak_events` | user_id, vote_id, before, after, freeze_id, kind (history and audit for support) |
| `feed_inbox` | user_id, kind (`result`/`celebration`/`unlock`/`month_close`), payload, created_at, seen_at (the per-user queue of result cards and celebrations) |
| `quest_defs` | key, window (`daily`/`weekly`/`once`), target, counter, reward (cosmetic_item_id or badge bonus), active, sort |
| `user_quests` | user_id, quest_id, period_key (`2026-10-08`, `2026-W41`), progress, done_at, reward_granted_at. Lazy periods mean **no reset job** |
| `badge_defs` / `user_badges` | thresholds int[3], counter key, tier-3 reward / user_id, badge_id, counter, tier, tier_up_at |
| `unlock_defs` / `user_unlocks` | 13 steps, primary_rule jsonb, backup_votes / user_id, unlock_id, unlocked_at, seen_at |
| `trait_defs` / `trait_votes` | label forms (m/f), status (`pending`/`approved`), created_by / voter_user_id, player_id, sport_id, trait_id, unique |
| `level_snapshots` | player_id, sport_id, value, tier, direction, inputs jsonb, algo_version, computed_at |
| `league_seasons`, `league_groups`, `league_members` | month_key / season, tier (`bronze`/`silver`/`gold`), group_no / user_id, group_id, final_rank, outcome |
| `quiz_cards` | family, sport_id, kind (`static`/`dynamic`), template_id, content jsonb (question, options, clues, right_index, result data), subject_player_ids[], subject_match_id, when (`before`/`after`/`weekly`), status (`draft`/`approved`/`retired`), valid_from/to (evolves the `daily_cards` table from the pivot branch) |
| `quiz_templates` | family, trigger, slot_template, option_templates, guardrails jsonb, active |
| `daily_sets` | day_key, tier (`free` 6 / `pro` 12), card_ids[] ordered, published_at (09:00) |
| `kudos_options`, `kudos` | forms (m/f/plural) / from_user, to_player, match_id, option_id, unique (from_user, match_id) |
| `reaction_pool`, `reactions` | key, label / user_id, match_id, reaction_key, unique (user_id, match_id). Counts via view |

**Commerce, ads, messaging, ops**

| Table | Key columns |
|---|---|
| `products` | sku, kind (`subscription`/`consumable`/`non_consumable`), price_eur, apple_id, google_id, stripe_price_id, grants jsonb (e.g. `{freeze:1}`, `{cosmetic:"frame_x"}`, `{pro_days:7, gift:true}`) |
| `purchases` | user_id, product_sku, store (`apple`/`google`/`stripe`), store_txn_id unique, status, amount, currency, raw, created_at |
| `entitlements` | user_id, key (`pro`), source (`subscription`/`gift`/`promo`/`migration`), store, starts_at, ends_at, status. The single source of truth the client reads |
| `pro_waitlist` | user_id or email, price_shown, context (which Pro moment), created_at (the fake door) |
| `gifts` | giver_user_id, receiver_player_id, receiver_user_id, product_sku, match_id, purchase_id, status (`pending`/`accepted`/`expired`), accepted_at |
| `cosmetic_items` | category (`frame`/`background`/`kit`/`win_effect`), key, name_el, kind (`free`/`earned`/`buy`/`pack`), product_sku, earn_rule_text, asset refs, sport_id null = all |
| `user_cosmetics`, `user_equipped` | user_id, item_id, source (`earned`/`bought`/`gift`/`migration`) / user_id, category, item_id |
| `sponsors`, `sponsored_campaigns`, `ad_daily_stats` | category (with a check excluding betting/gambling) / creative fields, placement (`feed`/`results`), area_ids, starts/ends, weight, status / campaign_id, day, impressions, clicks |
| `push_tokens`, `notification_prefs`, `notifications` | user_id, expo_token, platform / per type / user_id, type, payload, channel, dedupe_key unique, scheduled_at, sent_at, read_at |
| `outbox` | kind, payload, idempotency_key unique, run_after, attempts, last_error (replaces `notification_retry_queue` and is general purpose) |
| `moderation_queue` | entity_type (`match`/`player`/`trait`/`tournament_suggestion`/`name_fix`), entity_id, payload, status, reviewer, decided_at |
| `audit_log` | actor, action, entity, before/after |
| `email_templates`, `email_logs`, `mailerlite_logs` | kept from v1 (content reviewed) |
| `legacy.*` | archived v1 economy (section 8) |

### 3.3 Old tables: keep, migrate, drop
| v1 table | v2 fate |
|---|---|
| `players` | **Migrate** into `players` + `player_sports(tennis)`, keeping ids and slugs. Photos are copied to a new bucket |
| `profiles` (incl. `claimed_player_id`) | **Migrate** identity fields. Drop balance/coins columns into `legacy` |
| `tournaments`, `tournament_categories`, `tournament_participants`, `tournament_teams`, `team_members` | **Migrate** into tournaments / tournament_events / tournament_entries |
| `matches`, `match_results` | **Migrate** into matches + match_sides + match_results (source `admin`, status `confirmed`, counts_for_levels true) |
| `head_to_head`, `doubles_head_to_head`, `partnerships` | **Recompute** (derived), no data copy |
| `notifications`, `notification_retry_queue`, `admin_notifications`, `admin_in_app_notifications` | **Drop**, start fresh |
| `email_templates`, `email_template_versions`, `email_template_variables` | **Keep**, rewrite content for the new product |
| `email_logs`, `mailerlite_logs` | archive to `legacy` |
| `bets`, `parlays`, `transactions`, `coin_packs`, `daily_rewards`, `power_ups`, `user_power_ups`, `power_up_usage_log`, `tournament_purchases`, `dynamic_content` | **Archive** to `legacy` (read-only dump), not used by v2 |
| Edge fns: `calculate-odds`, `wallet-operations`, `daily-rewards`, `sync-matches`, `remove-matches-from-web` | **Delete** |
| Edge fns: `send-email`, `process-user-emails`, `mailerlite-*`, `_shared` | **Port** with CORS restricted and auth checks |
| Edge fn: `match-automation` | Replaced by pg_cron status transitions |

### 3.4 RLS approach
- Deny by default. RLS is on for every table, with no `insert`/`update`/`delete` policies for `authenticated` on game, commerce or ledger tables.
- Reads:
  - The user's own rows: `user_id = auth.uid()`.
  - Public roster and match data through views. These views filter `players.hidden`, `is_minor` (for dynamic content), and blocked users.
  - Aggregates (tallies, reaction counts, trait counts) only through views, so **who voted is never exposed**.
- Writes:
  - Simple user writes go through `security definer` RPCs with explicit checks: `follow_player`, `update_profile`, `react`, `give_kudos`, `equip_item`, `hide_me`, `report`.
  - Game writes go through the `game` edge function (3.5).
  - Commerce writes go only through webhooks running as the service role.
- Admin: `profiles.role in ('admin','editor')` is checked in RPCs and in admin middleware. There is no blanket service-role use in the admin UI; it uses server actions with a role check.
- Storage: buckets `player-photos` and `avatars` allow public read, with writes only via signed upload URLs from an admin RPC. This fixes the v1 open write policy.
- Tests: pgTAP tests per table assert that anon and authenticated users cannot write. These run in CI.

### 3.5 Server-authoritative game logic
**[DECIDE] Where the rules engine runs.** Recommendation: **one TypeScript rules engine in `packages/core`, executed server-side by a `game` edge function inside a single Postgres transaction**, with plain SQL RPCs for simple writes.
- Why: the rules (chain bonus, two freeze kinds, 13 unlocks with backup triggers, 16 badges, quests, ladder) change often during tuning. In TypeScript they are one source of truth for the server and for the client's optimistic animations, and AI assistants and the team write and test TS faster than plpgsql.
- How: the edge function connects through the Supavisor transaction pooler with a Postgres driver and does all of this in one transaction:
  1. `BEGIN`
  2. `pg_advisory_xact_lock(hash(user_id))`
  3. load state
  4. `core.apply(event)`
  5. write the diffs
  6. `COMMIT`
- **M0 spike to verify:** Supabase function bundling of a workspace package. The fallback is a build step that emits `core` as one ESM file into `supabase/functions/_shared/`.
- Alternative: everything in plpgsql. That gives lower latency and no connection management, but it means duplicating the rules in TS for the client.

Write paths:
- `POST game/vote {client_event_id, subject, option}`:
  - Validates that the match is still open.
  - Inserts the vote. The unique `client_event_id` makes retries safe.
  - Bumps the tally and the counters (`votes_cast`, active day, every-15 free freeze).
  - Advances quests and unlocks.
  - Returns the split plus deltas (quest bar, unlock), which drives the slim progress bar.
- `POST game/log-match`, `confirm-match`, `dispute`, `kudos`, `quiz-answer`: same pattern.
- **Result resolution:**
  - Inserting or confirming a `match_results` row enqueues `outbox(kind='resolve_match', key='resolve:<match_id>:<result_version>')`.
  - The resolver claims jobs with `for update skip locked`.
  - For each unresolved vote, ordered by `votes.created_at`, under a per-user lock, it computes the outcome and then writes:
    - ledger rows (unique key)
    - σερί/freeze logic
    - badge counters
    - unlock checks
    - `feed_inbox` result card
    - notification outbox row
  - Re-running a job is a no-op: votes with `resolved_at` set are skipped, and ledger keys are unique.
- **Result corrections** (admin edits a score or the winner): bump `result_version`. A compensating job reverses ledger rows (`reason=correction`) and recomputes the streak from `streak_events`.

**[DECIDE] σερί ordering.** Results arrive out of order. Recommendation: the σερί advances in **order of resolution time**, the moment the user sees the card. This matches the "result card returns to the top" experience. A later correction does not rewrite the σερί; it only adjusts points.

**[DECIDE] Level algorithm.** The spec says "voted by the crowd" but gives no formula. Recommendation:
- Use a nightly `recompute_levels` job (versioned `algo_version`, weights tunable in admin).
- It is a Bayesian blend:
  - prior = admin `initial_level` (NTRP import)
  - crowd signal = vote share in that player's matches, weighted by voter accuracy
  - confirmed results = strongest weight
  - traits = small weight
- Show it as tiers with direction (7-day delta). The player stays `pending` until 3 confirmed matches or 10 votes.
- Write this up as a 1-page spec before M3.

### 3.6 Scheduled jobs
**Recommendation:**
- **pg_cron + pg_net** for everything inside the database.
- **GitHub Actions cron** for scrapers, which need Node or Playwright and run longer than edge limits.
- **No Vercel crons**, which removes the v1 ambiguity.

pg_cron runs in UTC. Each Athens-time job is scheduled at both possible UTC hours and guards with `extract(hour from now() at time zone 'Europe/Athens')`.

| Job | When (Athens) | What |
|---|---|---|
| outbox dispatcher | every minute | calls edge fns (`push-send`, `resolver`, `email`) via pg_net, with retries and backoff |
| match status | every 5 min | `scheduled` → `played` after start plus duration, link expiry warnings |
| daily quiz publish | 09:00 (built at 03:00) | `daily_sets` for free/pro, dynamic cards from approved drafts |
| weekly dynamic drafts | Sun 18:00 | generate drafts for admin review, published Monday 09:00 |
| nightly | 03:00 | levels, circle, form/record caches, h2h, tally reconciliation, ad stats rollup |
| month close | 1st 00:05 | final ranks, promotion/relegation, top-3 awards, new groups of 20, `feed_inbox` month-close cards |
| ingestion | 08:00 and 22:00 (GitHub Actions) | scrape, then `ingest_candidates`; auto-approve only exact matches |

---

## 4. Backend services

### 4.1 Ingestion pipeline
1. **Sources** (one adapter each in `tools/ingest/sources/*`):
   - `tennisleague.gr` and `athenstennis.gr` (HTML scrape, Playwright only if needed)
   - ITF MT events (ITF public calendar/draws)
   - organiser CSV upload (admin)
   - the **master Google Sheet** (Sheets API, service account)
2. **Normalise** into a canonical `IngestMatch {sport, tournament, event, round, starts_at, venue, sides[[name]], score?, external_id}`:
   - Greek/Greeklish name normalisation reuses the `search_norm` logic.
   - Scores are parsed into winner-first sets, then validated by `core` (2-0 / 2-1 tennis rules, the coherence check).
3. **Match players:**
   - exact `search_norm` plus area: auto
   - `player_aliases`: auto
   - trigram similarity at or above 0.85 with the same gender: suggested
   - otherwise "new player" proposal
   - No new player is ever created without review.
4. **Dedupe:**
   - Key = (sport, date ±1 day, same set of player ids).
   - If a **player-logged** match exists, the candidate attaches as corroboration: the official source confirms it and marks it `confirmed`. No duplicate is created. A score conflict goes to review.
   - Re-runs of the same source are idempotent by `source_ref` and the record hash.
5. **Review queue** (admin): bulk approve for green rows, fix player links inline, merge, reject.
   - Approved schedules create `matches` (`scheduled`).
   - Approved results create `match_results`, which triggers resolution.
6. **Master Sheet:**
   - Treat the sheet as **an input source plus a read-only export**, not as the database.
   - Admins can paste rows there.
   - A nightly export writes the canonical tables back to a separate tab for the founder's overview.
   - **[DECIDE]** if the founder wants two-way editing. Recommendation: no, because two-way sync is a classic source of corruption.

**[DECIDE] Source permissions.** Recommendation:
- Ask the operators of tennisleague.gr and athenstennis.gr for permission or a feed, framed as "we send players to your tournaments".
- Scrape politely: twice a day, cached, with an identifiable user agent.
- Store only names, results and schedules.
- Record a GDPR legitimate-interest assessment (see Risks).

### 4.2 Result resolution
Results come from three places: admin entry (M1), import approval (M4), and player-logged confirmations (M2).
- A result counts for votes immediately when it comes from admin or an official source.
- A player-logged result against a non-member shows at once. It counts for levels only after confirmation, but votes on it resolve at once.
- **[DECIDE]** Should votes on unconfirmed user-logged results wait for confirmation? Recommendation: resolve at once, and reverse on dispute.

### 4.3 Notifications
- Channels:
  - **In-app:** the `notifications` table plus `feed_inbox`. Supabase Realtime is optional; pull on foreground is enough.
  - **Push:** Expo Push Service, which is free and wraps APNs/FCM. `push_tokens` are refreshed on app open.
  - **Email:**
    - Resend for transactional mail: auth SMTP, receipts, the claim-link fallback.
    - MailerLite for lifecycle and marketing, reusing the v1 queue pattern through `outbox`.
- Every notification is an outbox row with a `dedupe_key`, for example `result:<user>:<match>`.
- Global rules:
  - quiet hours 22:30 to 08:30
  - at most 3 pushes per day, batching multiple results into one ("3 αποτελέσματα σε περιμένουν")
  - per-type prefs
  - no Pro renewal or expiry pushes
- Types follow spec section 4. Unlock moments are in-app only.

### 4.4 Dynamic weekly questions
- Port the `pivot/daily-run` generators, templates and `validate.ts` into `core/quiz`, extended to the 18 template families with data feeds:
  - rematches
  - first meetings
  - finals
  - 3+ win runs
  - upsets
  - comebacks
  - mixed
  - double days
  - super tie-breaks
- Generation is **deterministic slot-filling with Greek grammar** (`name_forms`). There is no LLM in the production path.
- Guardrails:
  - exclude minors
  - exclude hidden players
  - require at least N votes of data
  - ban betting vocabulary (validated by the `copy` lint)
- Output is `quiz_cards(status='draft')`. Admin approves (bulk) and the 09:00 job publishes.
- An optional LLM rephrasing helper in admin only, behind review, can come later.

### 4.5 Analytics
- **PostHog Cloud EU** for the product (free tier 1M events/month): funnels, retention, feature flags for unlock thresholds and the price test.
- **GA4 and Vercel Analytics on the site only.**
- Server-side truth stays in Postgres (votes, ledger, purchases). PostHog is for behaviour.
- Event taxonomy, owned in `core/analytics.ts`:
  - `onboarding_step`
  - `claim_completed`
  - `vote_cast`
  - `result_card_seen`
  - `streak_changed`
  - `freeze_used`
  - `quest_progress` / `quest_completed`
  - `unlock_reached`
  - `match_logged`
  - `match_confirmed`
  - `link_opened`
  - `kudos_sent`
  - `quiz_completed`
  - `pro_sheet_viewed{moment}`
  - `pro_cta_pressed{price}`
  - `purchase_started/completed{sku,store}`
  - `ad_impression/click`
  - `share{surface}`
- Consent banner on web. On native, no tracking across apps, so ATT is not needed.
- Sentry free tier for errors on all apps.

---

## 5. Payments

### 5.1 Stack
**Recommendation: RevenueCat for iOS, Android and web (RevenueCat Web Billing on Stripe), with one `entitlements` table fed by the RevenueCat webhook.**
- RevenueCat is free up to 2.5k$ monthly tracked revenue, then 1%.
- It removes receipt validation, renewal and grace-period handling, cross-platform entitlement merge and refund events. Building that for 1 to 2 developers costs weeks.
- Identity: RevenueCat `app_user_id` = Supabase `user_id`, set at login.

| Product | Type | Price | Stores |
|---|---|---|---|
| `pro_monthly` | auto-renewing subscription | 8,99€ | Apple, Google, Stripe web |
| `freeze_1` | consumable | 0,99€ | all |
| `gift_coffee`, `gift_both` | consumable | 0,99€ / 1,99€ | all |
| `gift_pro_week` | consumable that grants 7 days of `pro` to a **receiver** | 1,99€ | all |
| `win_effect_*`, `frame_*` (10), `kit_*` (6) | non-consumable | 1,99€ | all |
| `bg_*` (7) | non-consumable | 0,99€ | all |

- Flow: purchase in the client, then RevenueCat. The RevenueCat webhook posts to the `payments-webhook` edge fn, which verifies the auth header and then:
  1. upserts `purchases` (unique `store_txn_id`)
  2. applies `products.grants`:
     - entitlement rows
     - `freezes`
     - `user_cosmetics`
     - `gifts`
  3. writes `feed_inbox` and notifications
- Consumables are granted only on the webhook (server), never on the client callback.
- Restore purchases uses RevenueCat's restore plus a server re-sync.
- The client reads entitlements from our DB view `my_entitlements`, so perks gate the same way on web and native. RevenueCat SDK state is only a fast path.

### 5.2 Store rules
- Inside the iOS/Android apps, **all** digital goods use store billing. That covers Pro, freezes, cosmetics, and gifts of a Pro week or a coffee: gifting digital content to another user is allowed as an IAP that grants server-side credit.
- **No links or prices pointing to web checkout inside the app**, except where a storefront explicitly allows it. US external links are permitted since 2025. EU alternative terms under the DMA exist but are not worth the complexity at this scale.
- Web users pay with Stripe through RevenueCat Web Billing, and entitlements carry across.
- Apple Small Business Program and Google's 15% tier apply: enrol both in M4.
- Prices: Apple and Google EUR price points include 0,99, 1,99 and 8,99. Keep the same prices on web, since a web discount cannot be advertised in-app anyway.
- Subscription UX: the spec says "no renewal or expiry states". Apple still requires clear terms on the paywall (price, period, auto-renew, links to terms and privacy) and a manage-subscription link. These are legal minimums, not reminder states.
- Required for review:
  - in-app account deletion (5.1.1(v))
  - Sign in with Apple if Google sign-in is offered (4.8)
  - report and block for UGC (1.2)

### 5.3 Ads
**Recommendation: in-house sponsored cards, sold directly to local sponsors** (racket shops, clubs, coaches, sportswear). No ad SDK.
- The card format matches the design system.
- No tracking SDKs means no ATT prompt and lighter GDPR consent.
- The no-betting guardrail is enforced in the DB.
- Greek programmatic CPMs are low, so direct deals beat AdMob at under 50k MAU.
- Serving is part of the `get_feed` RPC: weighted rotation, never two in a row, area targeting, impressions counted in batches.
- Revisit AdMob native ads only if direct sales cannot fill inventory after launch.

### 5.4 Fake door first
- Pro ships as a **fake door** in M1: the sheet, «Γίνε μέλος», then `pro_waitlist` with `price_shown` and the moment.
- The price variant is served by a PostHog flag if the founder wants to keep testing price.
- Real billing arrives in M5, only after the tournament features that justify Pro exist (monetization plan: tournaments get built first).

---

## 6. Admin app
**Keep** (port to the v2 schema):
- players (CRUD, photos, CSV import, merge)
- profile-claim approvals
- tournaments and categories
- matches and results entry (with set scores, retirement, super tie-break)
- users list
- email templates
- MailerLite tooling

**Remove:**
- economy metrics
- coin packs
- power-ups
- bets/parlays views
- odds tools
- wallet operations
- daily rewards

**Build**, in milestone order:
1. **Auth hardening (M0):** `middleware.ts` with a server session plus role check, no client-only guard, and an audit log on every mutation.
2. **Results desk (M1):**
   - today's matches
   - quick score entry
   - "announced before played" flag
   - mark disputed
   - void
   - correction with resolution preview ("this changes 132 votes")
3. **Import review queue (M1 basic CSV/Sheet, M4 full):** run log, candidate table with confidence colours, inline player linking, bulk approve, conflict view against player-logged matches.
4. **Moderation queue (M2):** user-logged matches, new players and names, traits, «Άλλο» tournament suggestions, reports.
5. **Roster (M2):**
   - initial level
   - minors flag
   - hidden
   - aliases
   - merge duplicates
   - claim conflicts
6. **Quiz bank (M3):**
   - card CRUD with live phone preview (using `copy` and `core`)
   - template list with guardrails
   - draft review with bulk approve
   - "preview day N" for free and pro sets
7. **Game config (M3):**
   - quests and rewards
   - badge thresholds
   - unlock thresholds (mirrored to PostHog flags)
   - kudos and reaction pools with gender forms
   - ladder admin (groups, month close dry run)
8. **Tournaments for Pro (M4):** entry deadlines, draw publish (fires the draw alert), schedule, active-tournament suggestions.
9. **Commerce (M5):**
   - products and cosmetics catalogue (assets, prices, store ids)
   - user entitlements (grant Pro, gift weeks, view purchases and refunds)
   - Pro waitlist export
10. **Sponsored cards (M5):** sponsors, creatives, targeting, schedule, reporting.
11. **Metrics (M3 onward):** a small dashboard with WAU, votes/day, results resolved, D1/D7 retention (PostHog embed), waitlist conversions, revenue (RevenueCat).

---

## 7. Website (apps/site)
- **Pages** (Greek at `/`, English at `/en`, hreflang both ways):
  - Αρχική («Τα πάντα για το ερασιτεχνικό τένις», «Επιτέλους, έχεις κι εσύ κερκίδα.»)
  - Πώς παίζεται
  - Pro
  - Για παίκτες (find and claim your profile)
  - Τουρνουά (public calendar)
  - FAQ
  - Επικοινωνία / χορηγοί (sponsor enquiry form)
  - legal: privacy, terms, cookies
  - press kit
- **Share and claim landings:**
  - `/m/<token>` (opponent link) and `/p/<slug>` (player card) render server-side OG images with `@vercel/og` and a Greek font.
  - They hand over through universal links (`apple-app-site-association`, `assetlinks.json`) to the app if installed, else to `app.netprophet.gr`.
  - The claim and confirm flow itself lives in the app (web build too), so there is one implementation.
- **SEO:**
  - SSG pages, sitemap and robots.
  - `SportsEvent` structured data on tournament pages.
  - Fast Greek typography.
  - Redirect old v1 URLs (`/el/matches`, `/el/leaderboard`) to the app or the site.
  - **[DECIDE] Public player pages for unclaimed players.** These are strong for SEO ("όνομα + τένις") but carry privacy risk. Recommendation: index only **claimed and public** profiles plus tournament pages. Unclaimed players appear inside the app only, with «Κρύψε με» one tap away.
- **Waitlist and fake door:**
  - The Pro page has «Γίνε μέλος» with an email field. It writes to `pro_waitlist` and a MailerLite group `pro-waitlist`.
  - The price variant comes from a PostHog flag, for example 8,99 vs a test price.
  - The confirmation reads «Είσαι στη λίστα».
  - The same signup feeds the beta invite list.

---

## 8. Data migration and cutover

### 8.1 What moves
An ETL script `tools/migrate/v1-to-v2.ts` is idempotent, keeps v1 ids where possible, and writes a report. It is rehearsed against a restored copy of v1 prod in M5 and M6.

| Data | Method |
|---|---|
| Auth users (email/password, Google, OTP) | Copy `auth.users` + `auth.identities` rows (bcrypt hashes are portable) into v2-prod with the same UUIDs. Configure the same Google OAuth client. Sessions do not carry over (different JWT secret), so users sign in once; tell them in the comms |
| Profiles and claims | Map identity fields, `claimed_player_id` becomes `players.claimed_by_user_id`. Pending claims go to the moderation queue |
| Players | All rows plus `player_sports(tennis)`, `search_norm` recomputed, `name_forms` generated and then spot-checked by an admin. Photos copied bucket to bucket |
| Tournaments, categories, participants, teams | Mapped to tournaments / events / entries |
| Matches and results | Mapped as `source='admin'`, `status='confirmed'`, `counts_for_levels=true`. Then run `recompute_levels` and the caches. H2H is recomputed |
| Coins, bets, parlays, transactions, power-ups, rewards | **Not migrated.** `pg_dump` to `legacy` schema in the v1 project (kept read-only for 12 months) plus an offline encrypted archive |

### 8.2 Old users' coins and bets
**[DECIDE]** Some users paid real money for coin packs (Stripe). Recommendation:
- **Everyone** gets a «Πρώτη γενιά» (founding) frame plus badge in v2 (`source='migration'`).
- **Paying users** get Pro time: 1 month per 5€ spent, minimum 1 month, granted as `entitlements(source='migration')`. They also get a stated option to request a refund of the unused purchased balance within 60 days.
- Check this with an accountant or lawyer for Greek consumer law.
- Bets and history are not shown in v2. A one-time "your v1 stats" email (correct picks, best run) is a nice goodbye.

### 8.3 Cutover runbook
| When | Step |
|---|---|
| T-21 | Feature freeze on v1 (security fixes only). v2 beta stable for 2+ weeks on TestFlight/Play closed, crash-free rate at or above 99.5% |
| T-14 | Rehearsal 1: restore v1 prod to a scratch project, run the ETL into a fresh v2-staging, verify counts/checksums and a 30-user spot check, log timings |
| T-10 | App Store / Play submissions with phased release paused; site v2 ready on preview domain |
| T-7 | Comms 1: email (Resend to all users) plus MailerLite campaign plus in-app banner on v1: what is changing, the date, the founding frame, the coin policy, "you will log in once" |
| T-3 | Rehearsal 2 (timed, the same scripts as the cutover) |
| T-0, 07:00 | v1 into read-only: maintenance banner, write RPCs disabled with a feature flag, Stripe coin checkout disabled, crons paused |
| T-0, 07:15 | Final ETL (expected under 30 min at current size), verification queries, resolve smoke tests |
| T-0, 08:00 | Switch domains in Vercel: `netprophet.gr` to `np-site`, `app.` to `np-app-web`, `admin.` to `np-admin-v2`; `netprophetapp.com` redirects. Release the apps from store hold. Merge `v2` into `main`, tag `v2.0.0` |
| T-0, 09:00 | Comms 2 «Είμαστε live»; first daily quiz goes out at 09:00 |
| T+1 to T+7 | Watch dashboards. Keep v1 project read-only. Hotfix on `main` (now v2) |
| T+90 | Delete the v1 Vercel projects. Downgrade v1 Supabase after the final archive dump |

**Rollback** (within 48h):
1. Point domains back to the v1 Vercel deployments (instant).
2. Re-enable v1 writes. The v1 DB was frozen, not modified, so it is intact.
3. Pause the app store release.
4. v2 writes made during the window (new votes, sign-ups) are exported and replayed later, or dropped with an apology.

After 48h, roll forward only.

**MailerLite:**
- Before cutover, remove the v1 coin/bet custom fields and update the automations (the v1 weekly, inactivity and match-alert flows are retired).
- Map v2 lifecycle groups: `onboarded`, `claimed`, `active-7d`, `pro-waitlist`, `pro`, `lapsed`.
- Re-point the sync to v2-prod.

---

## 9. Phased roadmap
Effort is in person-weeks (pw), assuming 1 to 2 developers with AI coding assistance. Calendar time is about pw / 1.6 with two devs (coordination overhead) or pw × 1 with one, plus a 20% buffer.

**M-1 (now, 0 dev pw): fake door on the prototype.**
- Run monetization tests 1 and 2: questionnaire, plus the prototype or video sent to 50 to 100 roster players with «Γίνε μέλος».
- This needs no engineering and de-risks Pro before M5.

| Milestone | Scope | Exit criteria | Effort |
|---|---|---|---|
| **M0 Foundations** | `v2` branch, CI, v2-dev project with the squashed baseline (core identity, roster, competition tables), RLS test harness, monorepo restructure (`app`, `site`, `core`, `ui`, `copy`, `db`), toolchain upgrades, Expo skeleton with auth (email OTP, Google, Apple), tokens and glyph font, **animation spike** (vote card plus result flight on low-end Android), edge-bundling spike, players/tournaments/matches copied from v1 prod into v2-dev, security fixes (storage, CORS, admin middleware) | CI green on `v2`; `db reset` from zero works; app runs on iOS/Android/web against v2-dev; spike signed off by founder | 3 |
| **M1 Core loop + first real-user test** | Feed (`get_feed`) with match cards, one-tap vote, split, fold, «Μαθαίνεις απόψε»; admin results desk; resolver plus ledger plus σερί (without paid freezes) plus `feed_inbox` result cards with the full juicy sequence; Αποτελέσματα (scoreboard, upset tag, «Το 'πες» pill); Παίκτες search and basic profile with follow; onboarding (welcome, claim, area, Ποιους ξέρεις, 3 slides); Pro **fake door**; admin CSV/Sheet import (basic review); push for results; PostHog | **Closed beta live**: 50 to 100 roster players on web plus TestFlight/Play internal, with real matches fed by admins for 2+ weeks. Measure D1/D7, votes per user per day, fake-door presses | 6 |
| **M2 Logging, claims, social** | + Ματς flow (all modes, mixed rules); confirmations in feed; opponent link `/m/<token>` with confirm, dispute, «Δεν έπαιξα εγώ», join-and-claim, «Κρύψε με»; kudos and reactions; moderation queue; report and block; roster tools; avatar renderer decision | A logged match against a non-member gets confirmed via link and creates a claimed account in under 2 minutes; moderation covers all UGC | 4 |
| **M3 Progression** | Quests (daily/weekly/friend), badges (16 × 3 tiers), unlock ladder (13 steps plus backups, flag-tunable), free freezes, celebrations queue, monthly ladder with leagues plus month close, «Οι 6 της ημέρας» with static bank plus dynamic templates plus admin review, Εγώ with avatar v1 and stats, traits voting, level algorithm v1 | A new user reaches the full experience in about 6 engaged days in a scripted test; month close dry run is correct on a copy; quiz runs 14 days without manual fixes | 6 |
| **M4 Tournaments and ingestion at scale** | Scrapers for 3 sources plus master sheet, 08:00/22:00 runs, dedupe against player-logged matches, full review queue; Τα τουρνουά σου (list, deadlines), draw publish, personal schedule, draw alerts (Pro-gated, still fake door) | 2 weeks of daily runs with at most 10 min of admin review per run; at least 90% auto-matched players | 5 |
| **M5 Pro, shop, payments, ads** | RevenueCat (iOS/Android/web), products, entitlements, Pro perks (scout, «Πού κερδίζεις», level numbers, win card, season recap v1, 12 quiz cards), paid freezes, cosmetics shop (Εμφάνιση), gifts with acceptance, sponsored cards plus admin, v2-prod project created | Sandbox purchases for every SKU on all 3 platforms; refund and restore paths tested; webhook replay idempotent | 5 |
| **M6 Native release readiness** | Store listings (el/en), screenshots, privacy labels, account deletion, Sign in with Apple, deep links, performance pass, accessibility, offline handling, crash reporting, Play 14-day closed test done, cutover rehearsal 1 | Both apps approved (phased release paused); crash-free at or above 99.5% in beta | 3 |
| **M7 Cutover** | ETL rehearsal 2, comms, cutover day, hypercare | Section 8.3 completed; v1 read-only; no Sev-1 for 7 days | 2 |
| **Total** | | | **34 pw** (about 21 to 25 calendar weeks with 2 devs including buffer; about 40 weeks solo) |

Notes:
- **Cheapest path to real users:** the first real test is at the end of M1, about 9 pw in (about 6 to 7 calendar weeks with 2 devs). It uses the Expo **web** build at `app-dev.netprophet.gr`, so it needs no store review, plus TestFlight for iPhone users.
- Native store release is deliberately M6. Beta testers use TestFlight and Play internal throughout.
- Multi-sport (padel) after M7 is mostly data and config: `sports` row, score model in `core`, sources, copy. Budget 2 to 3 pw.
- Running costs during build:

| Item | Cost |
|---|---|
| Supabase Pro (v1) + free (v2-dev), then a second Pro (v2-prod) from M5 | about 25 to 50$ |
| Vercel Pro | 20$ |
| Apple developer account | 99$/yr |
| EAS | free tier, or 19$ during heavy build months |
| PostHog, Sentry, RevenueCat | free tiers |
| Resend | free or 20$ |
| MailerLite | existing plan |

  The total is about 70 to 130€/month, within the 200€ budget.

---

## 10. Risks and open decisions

| # | Risk / decision | Recommendation |
|---|---|---|
| 1 | **Native stack** (Expo vs Capacitor vs PWA) | Expo universal; confirm with the M0 animation spike on a low-end Android. Capacitor is the fallback |
| 2 | **Schema strategy** | New Supabase projects with a squashed baseline; v1 stays untouched until cutover |
| 3 | **Old paid coins** | Founding frame for all; Pro months for payers plus a refund window; legal check |
| 4 | **Auth method** (spec says phone/email TBD) | Email OTP plus Google plus Apple. Phone OTP costs about 0,05 to 0,08€ per SMS in Greece and adds fraud surface; add it later if sign-up friction shows in the beta |
| 5 | **Scraping and GDPR for unclaimed real people** | Ask sources for permission; legitimate-interest assessment and a short DPIA; «Κρύψε με» everywhere; no public SEO pages for unclaimed players; store minimum data |
| 6 | **Minors** (junior players in rosters) | `is_minor` flag from birth year or source; exclude from dynamic cards, public pages and votes on traits; Greek digital consent age is 15, so require parental-consent copy for under-15 sign-up or block it. Decide before M2 |
| 7 | **Level algorithm undefined** | Bayesian blend spec written before M3, versioned and tunable; show tiers only |
| 8 | **σερί ordering with out-of-order results and corrections** | Advance by resolution time; corrections adjust points, not σερί |
| 9 | **Rules engine location** (TS edge vs plpgsql) | TS in `core`, run by the `game` edge fn in one transaction; plpgsql if the bundling spike fails |
| 10 | **Avatar renderer** (three.js vs Rive vs 2D) | Rive, decided by the end of M2; the data model is independent of it |
| 11 | **Content supply** (empty feed kills the loop) | Admins plus the Sheet feed matches from M1; ingestion in M4; measure "matches available per user per day" as a launch gate (at least 5) |
| 12 | **App Store risks** (UGC, "prophet"/prediction framing, subscription terms) | Report/block, account deletion, no betting words in the listing, category Sports, age rating 12+ |
| 13 | **Two-way Google Sheet sync** | No; the sheet is input plus read-only export |
| 14 | **Votes on unconfirmed user-logged matches** | Resolve at once, reverse on dispute |
| 15 | **Team bandwidth** (34 pw for 1 to 2 devs) | Hold scope: season recap, win effects and organiser hosting can slip past cutover without hurting the loop |
| 16 | **Vercel cron ambiguity and open security holes in v1** | Fix the storage policy and CORS on **v1 `main` now** as a hotfix, independent of v2 |
| 17 | **Ads revenue at small scale** | In-house sponsored cards sold directly; no SDK until 50k MAU |
| 18 | **Price test vs decided 8,99€** | Keep 8,99€ as the anchor; use the fake door to measure intent, not to re-open the price unless intent is below 2% |
