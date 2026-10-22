# Cutover runbook (v1 to v2)

Written from the dry run of 22 Oct 2026. It replaces the timeline in `implementation-plan.md` section 8.3, which
was written before most of it happened. Data mapping: `supabase-v2/migration-from-v1.md`. Scripts: `tools/migrate/`.

Who: **F** = founder (holds the passwords, the dashboards, the stores, DNS, the send button). **C** = Claude
(prepares, runs everything local and read-only, drafts, checks). The only writes to a hosted database are steps
marked F, and there are two of them.

## 1. Where things stand (dry run, 22 Oct 2026)

Already done, nothing to repeat at cutover:
- **Accounts, profiles and claims are in v2** since 9 Oct: 156 of v1's 158 accounts, same UUIDs (2 are missing, see
  the accounts note). 49 claimed players on v2 now (37 came from v1).
  Do **not** run `import_users_claims.sql` or `export_users_claims.sql` again: the v2 profiles have changed since
  (names spelled, onboarding), and before this PR a second run put the v1 values back.
- **The roster is in v2** (1,632 v1 players, same ids, names spelled by the accent pass since).
- **v1 has had no writes since the 9 Oct backup** (`tools/migrate/v1_inventory.mjs`): 0 players, tournaments,
  matches, results or bets changed; one account and one profile created (already in v2). The v1 web app is retired
  (16 Oct), the v1 Vercel projects are deleted (17 Oct), v1 Stripe was sandbox only.
- `netprophetapp.com` is already `apps/site`.

Still to do at cutover:
- **The v1 tournaments, matches and results.** The 9 Oct test sample is no longer on hosted: v2 has none of the 10
  v1 tournaments and none of the 393 v1 matches.
- Git: tag, archive v1, merge `v2` into `main`, point the deploys at `main`.
- Stores: release the v2 app. Comms. Then retire the v1 project.

### Counts (v1 backup 9 Oct, equal to live v1 on 22 Oct except the one later account)

| Entity | v1 | v2 now | After cutover (dry run) | Notes |
|---|---|---|---|---|
| auth accounts | 158 (86 email, 68 Google, 4 both; 9 unconfirmed) | 158: 156 from v1 + 2 new on v2 | unchanged | all confirmed in v2; 2 v1 accounts missing (note) |
| Google identities | 72 | 71 | unchanged | every Google identity of the 156 came along |
| Apple identities | 0 | 0 | unchanged | v1 had no Apple sign-in |
| profiles | 153 | 158 | unchanged | 5 v1 accounts had no v1 profile; v2 made one each |
| claims | 37 | 49 | unchanged | 15 v1 creation requests became v2 requests |
| roster players | 1,633 (1 demo) | 2,196 (1,632 from v1, 11 of them merged into another) | unchanged | 0 minors in v1 (1,609 aged 18+, 24 unknown); 1,344 carry v1's default age 25 |
| tournaments | 10 | 3 (sheets) | +9 (one v1 tournament has no matches) | all 9 marked finished |
| categories | 67 | | +65 | |
| matches | 393 | 0 from v1 | **+388**: 335 confirmed, 2 played without sets, 51 void | 5 rejected (v1 data errors, list in 6) |
| results | 343 (one match has two rows) | 0 from v1 | **+335** | 2 kept out (no sets), 5 with the rejected matches |
| bets, transactions, coin balances | 314, 1,278, 102 profiles | none | none | dropped for everyone; archived in the v1 dumps |

Accounts note: two v1 accounts are not in v2, by id or by email (compared as hashes):
- one in the 9 Oct backup (email sign-in, last v1 sign-in March 2026, no claim). It was imported on 9 Oct, so it was
  most likely deleted on v2 (Ρυθμίσεις, account deletion) and must stay deleted;
- the one made on v1 on 9 Oct after the backup (Google, asked for a new player). STATUS says #160 brought it over on
  17 Oct, but it is not there: the `--apply` run did not happen or the account was deleted since.

`node scripts/v1-users-to-resend.mjs` (dry run) would list both as "to add to v2", and `--apply` would create both.
F decides per account before any `--apply`. If nothing is done, both people simply get a new account when they sign in.

### Can v1 users sign in to v2?

Yes, with the same account:
- **Email**: every v1 account is in v2 with the same UUID and a confirmed email. They type the email and get the
  6-digit code. No passwords move (v2 has none).
- **Google**: v1 and v2 use the **same Google OAuth client** (same client id on both projects, checked read-only).
  Google's `sub` is per Google account, so the 71 copied Google identities match. An account that has only an email
  identity is linked by the verified email on the first Google sign-in (automatic linking; manual linking is off).
- **The two missing accounts** (note above): they sign in fine, into a new empty account.
- **Apple**: new in v2; no v1 identity to carry. Apple with the real email links to the existing account by email.
  With «Απόκρυψη email» Apple gives a relay address and that makes a new, empty account; the comms say to use the
  email or Google they used before.
- Everyone signs in once (different project, no sessions carry).

## 2. Go / no-go (F decides at T-1, 18:00)

Go only if every line is yes:
- [ ] v2 app approved on both stores, held for manual release (App Store) / not yet rolled out (Play).
- [ ] `tools/migrate/test/run.sh` passes and the T-3 rehearsal (section 4) gave the numbers of section 1.
- [ ] `node tools/migrate/v1_inventory.mjs 2026-10-09T08:13:51Z` still shows 0 match, result, player and tournament
      changes (else take a new v1 backup and update the expected numbers in `verify_cutover.sql`).
- [ ] Fresh backups of both projects exist and their SHA256SUMS check (step 1).
- [ ] The comms email is approved in Greek and English and the Resend audience is ready.
- [ ] F has decided on the 7 rejected v1 results (fix by hand after the import, or leave out).
- [ ] F has reviewed the sure duplicates on `/v2/players/duplicates` (50 sure and 47 likely pairs touch a v1 player).
      Not blocking: merges after the import move the matches too.
- [ ] Nobody merges players on admin during the window (steps 2 to 6), so the mirrored roster stays true.
- [ ] Rollback owner and time box agreed (section 7).

## 3. Timeline

| When | Who | Step | Time |
|---|---|---|---|
| T-7 | F | Comms 1 (section 8). Decide the 7 rejected results and the deleted account. | 30 min |
| T-3 | C | Rehearsal: section 4 steps 2 to 5 on the local stack against a fresh read of hosted, plus the apply on a throwaway copy. Report numbers and timings. | 30 min |
| T-1 | F | Go / no-go. | 15 min |
| T-0 07:00 | F | Backups (step 1). | 20 min |
| T-0 07:20 | C | Steps 2 to 5 (local), share the report. | 10 min |
| T-0 07:30 | F | Step 6: apply to hosted (the one data write). | 2 min |
| T-0 07:35 | C+F | Step 7 verify, step 8 follow-ups. | 15 min |
| T-0 08:00 | F | Section 5: git, deploys, stores. | 30 min |
| T-0 09:00 | F | Comms 2. | 10 min |
| T+1 to T+7 | C | Watch: Sentry, PostHog sign-ins, admin results desk, support mail. Hotfixes go to `main`. | |
| T+14 | F | Pause the v1 Supabase project (section 6). | |
| T+90 | F | Delete the v1 project after the archive check (section 6). | |

The dry run took 21 seconds end to end (schema, staging, import 2 s, export, apply 2 s, levels 3 s on a local copy).

## 4. Data steps (T-0)

All commands from the repo root of the main checkout (`.env.local` there). C never prints secrets; the database
passwords stay with F.

### Step 1. Backups (F, both projects, before anything else)
```bash
# v1: Docker running; asks for the v1 database password; writes ~/netprophet-backups/v1-<date>
scripts/v1-backup.sh
( cd ~/netprophet-backups/v1-<date> && shasum -a 256 -c SHA256SUMS )

# v2: the same three dumps of the hosted v2 project (linked in supabase-v2/.temp)
D=~/netprophet-backups/v2-$(date +%Y%m%d-%H%M%S); mkdir -p "$D" && chmod 700 "$D"
supabase --workdir .supabase-v2 db dump --linked -f "$D/schema.sql"
supabase --workdir .supabase-v2 db dump --linked --data-only --use-copy -f "$D/data.sql"
supabase --workdir .supabase-v2 db dump --linked --data-only --use-copy --schema auth -f "$D/auth.sql"
( cd "$D" && shasum -a 256 *.sql > SHA256SUMS )
```
Storage buckets are not in these dumps. v1 photos are not migrated (the v2 roster has none from v1), so nothing to copy.

### Step 2. Local stack with the v2 schema (C)
```bash
scripts/v2-db-remote.sh start                       # Docker; local Supabase on 54322
supabase --workdir .supabase-v2 db reset --no-seed  # every migration, no demo data
eval "$(supabase --workdir .supabase-v2 status -o env | grep '^DB_URL=')"
export PGHOST=127.0.0.1 PGPORT=54322 PGUSER=postgres PGPASSWORD=postgres PGDATABASE=postgres
```
No Docker: a plain Postgres 17 works too (the dry run used one) with the real `auth.users` and `auth.identities`
from the backup: `pg_restore --schema-only -n auth -t users -t identities --no-owner full.dump`, plus the role and
storage stand-ins of `supabase-v2/tests/support/supabase_stub.sql`.

### Step 3. Stage v1 and mirror the hosted roster (C, read only on hosted)
```bash
python3 tools/migrate/stage_v1.py ~/netprophet-backups/v1-<date> > /tmp/v1_stage.sql
psql -X -v ON_ERROR_STOP=1 -f /tmp/v1_stage.sql
supabase --workdir .supabase-v2 db query --linked -o csv -f tools/migrate/sql/hosted_players.sql > /tmp/hosted_players.csv
psql -X -f tools/migrate/sql/mirror_hosted_players.sql < /tmp/hosted_players.csv
```
Expect about 2,196 hosted players, 18 merged, 0 minors. The mirror is what lets the import see players merged on v2
since 9 Oct (11 v1 players; 3 v1 matches move to the kept player).

### Step 4. Import (C, local)
```bash
psql -X -v ON_ERROR_STOP=1 -v sample=0 -f tools/migrate/sql/import_roster_matches.sql
```
Expected report (9 Oct backup): 9 tournaments (9 finished), 65 events, 388 matches, 335 confirmed with result,
2 played without result, 51 void, 5 rejected, 2 results kept out, 4 notes. Anything else: stop and look at
`select * from etl.rejects`.

### Step 5. Export (C, local)
```bash
tools/migrate/export_v1_matches.sh /tmp/v1_matches_apply.sql
# wrote ...: 12 INSERT statements; rows: tournaments 9, events 65, matches 388, participants 1108, results 335
```
The file is one transaction of `INSERT ... ON CONFLICT DO NOTHING` for those five tables. No players, accounts or
profiles. Applying it twice changes nothing.

### Step 6. Apply to hosted (F, the write)
```bash
supabase --workdir .supabase-v2 db query --linked -f /tmp/v1_matches_apply.sql
```
If the Management API refuses the size, F runs the same file with
`psql "<session pooler URL>" -v ON_ERROR_STOP=1 -f /tmp/v1_matches_apply.sql` (password typed, never stored).
All or nothing: on an error nothing is written.

### Step 7. Verify (C, read only)
```bash
supabase --workdir .supabase-v2 db query --linked -f tools/migrate/sql/verify_cutover.sql
```
Every row `ok = true`. It checks 388 v1 matches, 335 results, none on a merged player, no incomplete side, 9
tournaments, no visible minor, profiles = accounts, the founding frame never given by migration (PR #283: the
`--grant-founding-frame` idea is dead, the frame is for Pro founding members only) and no coin, bet or odds column.

### Step 8. Follow-ups (F on admin, C checks)
1. Levels: «Recompute levels» on admin /v2/players (or wait for the nightly run at 00:30 UTC). 3 s on the copy.
2. The 7 v1 results that did not come in, fixed by hand on the results desk if F wants them:

   | v1 id (start) | Tournament | Day | Round | v1 says | Why |
   |---|---|---|---|---|---|
   | a899fa19 | Vari Tennis Open | 21 Mar | Round of 16 | 0-2, sets 6-0 6-1 | sets say the other side won |
   | fea32dbe | Vari Tennis Open | 21 Mar | Round of 32 | 0-2, sets 6-2 2-6 | 1-1 in sets, no third |
   | 5972c1ce | Tennis League Tournament | 8 May | Quarterfinals | 1-2, 3-6 6-2, super tie-break 10-5 | super tie-break says side A |
   | d4b3a36f | Tennis League Tournament | 23 May | Semifinals | 1-2, set 1 missing, 6-3, 8-10 | a set is missing |
   | 46e5e493 | West Attiki Tournament | 25 Jun | Round of 16 | 0-2, one set 1-6 | a set is missing |
   | a8fefd70 | Vari Tennis Open | 7 May | Semifinals | 0-2, one set 6-7 | match imported as played, no result |
   | b1617d2f | Tennis League Tournament | 15 May | Finals | 0-2, one set 0-6 | match imported as played, no result |

3. Spot check 5 claimed v1 players: profile, Αποτελέσματα, «Τα στατιστικά σου» show their v1 matches.
4. Stop the local stack: `supabase --workdir .supabase-v2 stop`.

## 5. Git, deploys, stores (T-0 08:00, F with C)

Git (main has nothing that `v2` lacks: 0 commits ahead, so this is a fast-forward):
```bash
git fetch origin
git tag -a v1-final origin/main -m "v1 at cutover"        # ccd28f93 unless main moves
git push origin v1-final
# archive: F creates the private repo evankardamitsis/netprophet-v1 (empty), then
git push git@github.com:evankardamitsis/netprophet-v1.git v1-final:refs/heads/main --follow-tags
# on GitHub: Settings > Archive this repository (read only, never deleted)
GH_PROMPT_DISABLED=1 gh pr create --base main --head v2 --title "release: v2 becomes main" --body "..." < /dev/null
# merge it with a merge commit (not squash), then tag
git tag -a v2.0.0 origin/main -m "v2 launch" && git push origin v2.0.0
```
After the merge:
- Vercel: the v2 projects (`apps/site` on netprophetapp.com, `netprophet-admin-v2`, the app web project) build from
  production branch `v2` today. Switch each to `main` (Settings > Git), redeploy, check the domain. The admin crons
  (sheets 3 times a day) only run on Production, so check the next run fires.
- GitHub: protect `main` like `v2` (PR only, CI `db` required); `main` is unprotected today. Keep `v2` until the
  first fix lands on `main`, then delete it. Update CLAUDE.md (branches) in that first PR.
- A follow-up PR removes the v1 folders from `main` (`apps/web`, `apps/mobile`, `packages/lib`, `packages/ui`,
  `supabase/`, `backup/`); they live on in `netprophet-v1` and the `v1-final` tag.
- The repo is public: nothing secret is in it (checked by name: the `.env.local` files are ignored).

Stores:
- v2 is a new listing, `gr.monadlabs.netprophet` (Monad Labs). Release it: App Store «Release this version», Play
  roll out to production.
- v1's app id is `com.netprophet.mobile` with no store submit setup and no developer account until 20 Oct, so v1 was
  never on the stores (F confirms in App Store Connect and Play Console). Nothing to unpublish; dev or internal
  builds of v1 stop working when the v1 project is paused, which is the point.

Auth settings to check on v2 before release (read only today):
- `site_url` is `https://app.netprophet.gr` and the redirect list has `netprophet://auth/callback` and
  `https://netprophet.gr/auth/callback`. If the web app lives elsewhere at launch (netprophetapp.com), add it, or
  Google on the web will not return.
- Apple client ids include `host.exp.Exponent` (Expo Go). Remove it for production.

## 6. Retiring v1

- T-0: v1 is already frozen in practice (no web app, no writes since 9 Oct). F may also set v1 auth «Disable new
  sign ups» so nothing new lands there.
- T+14: pause the v1 project (Supabase dashboard). Pausing keeps everything and can be undone.
- T+90: delete it (founder decision of 13 Oct), only after: the T-0 v1 backup restores into a scratch database, an
  encrypted offline copy exists in two places, and the dropped data (bets, transactions, coin balances, email logs)
  is in that copy. CLAUDE.md's "never deleted" is about the code, which lives on in `netprophet-v1`.
- MailerLite: v1 groups and automations off; v2 groups as in implementation-plan 8.3.

## 7. Rollback

Before step 6 nothing has changed: stop.

After step 6, within 48 h (all data changes are additive and marked):
```sql
-- F, on hosted, one transaction; removes only what the cutover added
begin;
set constraints all deferred;
delete from core.match_results where match_id in (select id from core.matches where source_ref like 'v1:%');
delete from core.match_participants where match_id in (select id from core.matches where source_ref like 'v1:%');
delete from core.matches where source_ref like 'v1:%';
delete from core.tournament_events e where e.tournament_id in (select id from core.tournaments where external_ref = id::text);
delete from core.tournaments where external_ref = id::text;   -- v1 tournaments only (external_ref = their v1 id)
commit;
```
If a delete stops on a foreign key (something made since points at a v1 match), the transaction removes nothing:
restore the T-0 v2 dump instead, or ask C to find the referring rows. Then «Recompute levels». Votes cannot exist on these matches (they are past and in finished tournaments), so nothing
else refers to them; check `select count(*) from core.votes v join core.matches m on m.id = v.match_id where m.source_ref like 'v1:%'` is 0 first. Worst case, restore the T-0 v2 dump.

Git: the merge to `main` is undone with `git revert -m 1 <merge>` in a PR, or by pointing Vercel back at `v2`.
Stores: halt the phased release (App Store) or the rollout (Play). There is no v1 to go back to: its web app and
Vercel projects are gone, so "rollback" means v2 without the v1 history, not v1.

## 8. Comms (F sends, C drafts)

- T-7, email 1 to the Resend audience «NetProphet v1 users» (`scripts/v1-users-to-resend.mjs`, dry run first; it
  also creates any v1 account missing from v2, so F checks its "to add to v2" line is 0 or expected before
  `--apply`). Draft, Greek first:
  - Θέμα: «Το NetProphet αλλάζει στις {ημερομηνία}»
  - Το νέο NetProphet βγαίνει σε iPhone, Android και web. Μπαίνεις με το ίδιο email (σου στέλνουμε κωδικό) ή με το ίδιο
    Google. Ο λογαριασμός σου, το προφίλ σου και τα ματς σου είναι ήδη εκεί.
  - Τα νομίσματα και οι παλιές προβλέψεις δεν περνάνε στο νέο app. Ξεκινάμε όλοι από την αρχή, με σερί και level.
  - Αν μπεις με Apple, διάλεξε «Κοινοποίηση email», για να βρεις τον λογαριασμό σου.
  - English: "NetProphet is changing on {date}. Sign in with the same email (we send a code) or the same Google
    account; your account, profile and matches are already there. Coins and old picks do not move over."
- T-0 09:00, email 2: store links, «Είμαστε live».
- The founder reviews every line (copy rules: Greek first, no betting words, «level», no em dashes).

## 9. Found in the dry run and fixed in this PR

- v1 stores a set won on a tie-break as the tie-break alone (`setN_score` empty, `setN_tiebreak_score` «7-4»). The
  import stopped at the first empty set: 15 matches were rejected and 9 results were dropped as "no sets". They now
  come in as 7-6 with the tie-break (all 25 such sets agree with v1's set winners).
- One v1 match has two result rows; the import took either. It now keeps the latest and notes it.
- Players merged on v2 since 9 Oct (11 from v1) would have kept their v1 matches on the merged, hidden row. The
  import now follows `core.current_player`, and `mirror_hosted_players.sql` gives the local copy the hosted merges.
- The 9 v1 tournaments ended months ago but v1 left 7 of them 'active'; they come in finished, so their matches never
  reach the feed. The 8 v1 matches still 'upcoming' from June and July come in void, not scheduled.
- `import_users_claims.sql` / `export_users_claims.sql`: a second run reset every v1 user's name, locale, role,
  onboarding and claim status to the v1 values and re-claimed players people had released on v2; an email already on
  another account aborted the whole run. Both now fill only accounts the same run creates and skip taken emails.
  Not fixable without a tombstone: an account deleted on v2 comes back if they run again (the cutover does not).

Side effects checked on the copy (37 claimed v1 players present): the import and the apply write no notification,
outbox job, identity flag, quest or badge progress (the schedule alert only fires for scheduled matches in the next
14 days; badges count only facts since `badges_since`). The apply file has no `\restrict` or `transaction_timeout`
line, so it runs through the Management API (hosted is PostgreSQL 17.11).

Data notes for later, not blocking:
- 1,344 v1 players have v1's default age 25, so their v2 `birth_year` (2001) is not real. Nothing shows it today;
  clear it before any feature uses age.
- Only 278 of 2,196 hosted players have a gender (v1 had 1,356 of 1,633 empty).
