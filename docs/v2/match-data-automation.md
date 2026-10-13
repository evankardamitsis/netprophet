# NetProphet v2: match data automation (build brief)

Goal: as many real matches as possible in each user's peer feed, with minimal admin work. Plain code, no AI in the main path. Stack: Next.js App Router, Supabase (Postgres, pg_cron, Edge Functions, Storage), Vercel crons, Resend.

## Sources
- Organiser Google Sheets / CSV (one tab per day; header row ΩΡΑ, ΚΑΤΗΓΟΡΙΑ, PLAYER 1, PLAYER 2, ΑΠΟΤΕΛΕΣΜΑ). Read via Google Sheets API with a NetProphet Google account the sheet is shared with. Find columns by header name, not position.
- ITF World Tennis Masters Tour, Greek MT events (pages are JS-rendered: read the page's own data request; headless browser only as fallback).
- tennisleague.gr and athenstennis.gr (access provided per tournament).
- Players via + Ματς / "Έπαιξες σήμερα;".
- No social media, no screenshots.
- Reference parser: `parse_oop.py` (stdlib Python, tested on the TAF RACE 2026-2027 sheet: 54 matches). Port its logic to TypeScript.

## Schedule (Europe/Athens)
- 08:00 schedules run: new matches, moved times/days, removed rows.
- 08:30 admin email (Resend): review items, overdue results, source health.
- 09:00 "who plays today" notification, only after the 08:00 run has completed.
- 22:00 results run.
- Both runs use identical matching and dedupe rules. Only tournaments with status "ongoing" are read.

## Parsing rules
- Date from tab name (day/month); season year inferred (Aug to Dec = first year, Jan to Jul = second); check the Greek weekday prefix matches.
- Time: accept 20.30, 20:30, 9:00, strip stray chars; a blank time inherits the row above.
- Category: keep organiser's raw text. Derive only singles vs doubles ("/" in a side = doubles). No category mapping.
- Score: parse "63 76", "62 36 10 6", "75 16 14-16", "57-26", "64-46 10-8" into sets + match tie-break and compute the winner. "wo" and "tbc" publish with raw text as the score; they do not settle votes/points until a clear result.

## Names and players
- App stores Greek names first-name-first (Βαγγέλης Καρδαμίτσης); sheets send ΚΑΡΔΑΜΙΤΣΗΣ ΕΥΑΓΓΕΛΟΣ.
- Normalise: strip accents, lowercase, final ς to σ, sort tokens. Nickname table (Ευάγγελος = Βαγγέλης, Κωνσταντίνος = Κώστας, Ιωάννης = Γιάννης, Γεώργιος = Γιώργος, ...). pg_trgm for candidates.
- player_aliases table: every confirmed spelling saved; exact alias hit = link.
- Decision: clear match (score >= 0.92 or alias hit) links. Unclear name whose likely candidate is in an active user's circle goes to review. Anything else creates a provisional player and the match publishes anyway. Re-check provisional players when someone signs up, claims a profile or follows a name.
- Surname-only entries link only if exactly one known player with that surname is in the same tournament.
- Hidden/opted-out players are on a blocklist and never re-imported.

## One match, never two
- Same match = same two sides (any order) + same singles/doubles + dates within 1 day.
- Fingerprint/idempotent upsert on every run; imports never duplicate.
- Import finds a player-logged match: attach as official source, no new match.
- Player adds a match that already exists: show "Αυτό είναι το ματς σου;" and confirm instead of creating. Search runs as they type the opponent.
- Near match (one player differs or 2+ days apart): create but hold in review before points.
- Points ledger keyed by (match_id, user_id) so points are paid once.

## Results and match lifecycle
- Precedence: admin > organiser source > both players agree > one player. Equal-rank disagreement = "disputed".
- Voting locks at scheduled start time (or start of match day if no time). If 08:00 moves the match, voting reopens until the new time; votes carry over.
- Same pair + same category reappearing on a later day while the earlier row has no result = moved, not new.
- Row missing from source in 2 consecutive runs = "cancelled"; votes cancelled, player logs kept.
- No result after 3 nights = overdue in admin email; after 7 = "χωρίς αποτέλεσμα".

## Admin (3 screens)
1. Tournaments: create, add sheet/site link, switch ongoing on/off, "Δοκιμή τώρα" dry-run preview of an import.
2. Review queue: only (a) names near an active user's circle, (b) possible duplicate matches, (c) organiser score vs player-confirmed conflicts. Each item pre-filled with a suggested answer; one key approves; every fix writes an alias.
3. Players: merge, view all aliases, fix a wrong link (merges reversible).

## Records sheet
- One Google Sheet "NetProphet Records" in Drive folder https://drive.google.com/drive/u/0/folders/17M3NGdA6BDT9U0wzQt26FuR_m65fat3E, owned by the NetProphet Google account, written via Sheets API after every run.
- Tab 1 "Overview": one row per tournament (source, venue, dates, status, totals, linked-name share, provisional count, last run).
- One tab per tournament, one row per match, upsert by match_id: match_id, tournament, source, source_ref (tab+row), date, time, venue, category_raw, format, side1/side2 raw names + player_ids, score_raw, score_sets, winner_side, status, result_source, player_logged, first_seen, last_updated.
- Last tab "Changes": every change with before/after, who, when.
- Create it only once the backend is ready to write real data.

## Safety nets
- Health check: each run compares every tournament with its previous run; zero or far fewer rows from an ongoing source is flagged red in the 08:30 email.
- Keep real source files (TAF sheet etc.) as test fixtures; parser changes must pass them.
- Store all source credentials in one place with expiry reminders.

## Build order
1. Tournaments page, Google Sheets adapter, records sheet writer
2. Name matching + aliases, seeded from the ~1,500-player roster
3. Dedupe check shared by imports and + Ματς, points ledger, voting lock
4. Review queue + 08:30 email with health check
5. Adapters for ITF, tennisleague.gr, athenstennis.gr
6. Before go-live: one-off import of last season's files

## Answered (Evan, 12 Oct 2026)
- A "wo" winner is not always PLAYER 1: the sheet does not say who won, so the admin picks the winner on import.
- The organiser's score always overrides, including two players who agreed.
- Imported players show by name in feeds before anyone claims them; claiming only links an account to the player.

## Built (M1 import)
- `packages/ingest`: the parse_oop.py port, checked against the TAF RACE fixture (54/54).
- Admin `/v2/import`: tournament (with surface), the sheet export or one CSV tab, people matched to the roster
  (aliases, trigram scores), a review table, then import. Same fingerprint = update; the organiser's score is the
  result. Not yet: moved-match detection, the 08:00/22:00 runs, the review email, the records sheet.

## Built (M4 part 1, 13 Oct 2026)
- Tournaments carry their source (`source_kind`, `source_url`, `season_start_year`) and an `ongoing` switch; only
  ongoing tournaments with a source are read by the runs.
- One write path (`core.ingest_apply`) for the import desk and the runs. People the desk did not decide are resolved
  in the database: an alias or one roster player at 0.92+ with a clear lead links; an unclear name whose likely
  player is in an active user's circle (claimed or followed by someone who voted in the last 30 days) holds the row
  for review; anyone else becomes a new provisional player and the match publishes. This follows this brief over the
  plan's older "no new player without review".
- Runs: `core.ingest_runs` logs every run (cron, staff, dry) with its counts and health (`drop` when a run sees under
  half the rows of the last one, `empty`, `error` when the sheet could not be read). «Δοκιμή τώρα» applies and rolls
  back. Walkovers publish and wait for staff to pick the winner (`core.ingest_reviews`, kind walkover).
- Admin `/v2/sources`: tournaments with their source and last run, «Δοκιμή τώρα», «Τρέξε τώρα», and the review list.
- The schedule: `apps/admin` cron `/api/cron/v2-ingest` at 08:00 and 22:00 Athens (Vercel cron, UTC hours checked
  against Athens time). Sheets are read with the Google Sheets API as NetProphet's service account
  (`GOOGLE_SERVICE_ACCOUNT_JSON`; the organiser or the founder shares each sheet with its email, as with a person),
  or, for sheets shared with anyone who has the link, an API key (`GOOGLE_SHEETS_API_KEY`).
- Needs in Vercel (admin project, `netprophet-admin`): `GOOGLE_SERVICE_ACCOUNT_JSON`, `V2_SUPABASE_SECRET_KEY`
  (the v2 Supabase project's secret key, `sb_secret_...`, not the legacy service_role JWT), `CRON_SECRET`.
- Service account: `netprophet-sheets@netprophet-466714.iam.gserviceaccount.com` (Google Cloud project NetProphet,
  Sheets API on, no roles). Organisers share their sheets with it as Viewer.
- Not yet: moved and cancelled matches, dedupe against player-logged matches, the 08:30 email, the records sheet,
  other platforms.

## Built (M4 part 2, name matching)
- First names compare by family (`core.first_name_families`: formal, everyday and nicknames, e.g. Φιλοθέη = Φαίη,
  Ευάγγελος = Βαγγέλης); staff can add rows. An initial («ΟΡ») matches the names it starts; the swapped reading is
  tried too.
- A surname alone links to the one player with it already in this tournament, else to the only one in the roster;
  several go to staff. A certain score with no clear lead (the same name twice in the roster) goes to staff, never a
  third copy.
- One staff decision writes the sheet spelling as an alias and releases every other row held only for that name.
- The desk's candidate list uses the same scoring.
- TAF sheet on the real roster (dry run): 41 matches straight in, 7 held on 5 names, 29 new players (from 51); the
  new ones are people not in the roster yet.
