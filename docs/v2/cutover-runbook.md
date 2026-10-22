# Cutover runbook (v1 to v2)

Written from the dry run of 22 Oct 2026. It replaces the timeline in `implementation-plan.md` section 8.3, which
was written before most of it happened. Data mapping: `supabase-v2/migration-from-v1.md`.

Who: **F** = founder (holds the passwords, the dashboards, the stores, DNS, the send button). **C** = Claude
(prepares, runs everything local and read-only, drafts, checks).

**Founder decision, 22 Oct 2026: no v1 data is imported at cutover.** v1 tournaments, matches and results are not
brought over (v2 does not show them). Accounts, profiles, claims and the roster are already in v2. The cutover
writes nothing to the hosted database; it is backups, git, deploys, stores, comms and retiring v1.

## 1. Where things stand (dry run, 22 Oct 2026)

Already in v2 since 9 Oct, nothing to repeat:
- **Accounts, profiles and claims**: 156 of v1's 158 accounts, same UUIDs. 49 claimed players on v2 now (37 came
  from v1). Do **not** run `import_users_claims.sql` or `export_users_claims.sql` again: the v2 profiles have changed
  since (names spelled, onboarding).
- **The roster**: 1,632 v1 players, same ids, names spelled by the accent pass since.

Also true today:
- **v1 has had no writes since the 9 Oct backup** (`tools/migrate/v1_inventory.mjs`): 0 players, tournaments,
  matches, results or bets changed. The v1 web app is retired (16 Oct), the v1 Vercel projects are deleted (17 Oct),
  v1 Stripe was sandbox only.
- `netprophetapp.com` is already `apps/site`.

Not imported, by decision: v1's 10 tournaments, 393 matches and 343 results (they stay in the v1 backups). Dropped
for everyone as planned: 314 bets, 1,278 transactions, the coin balances of 102 profiles.

### Counts (v1 live, 22 Oct)

| Entity | v1 | v2 now | At cutover |
|---|---|---|---|
| auth accounts | 158 (86 email, 68 Google, 4 both) | 158: 156 from v1 + 2 new on v2 | unchanged |
| Google identities | 72 | 71 | unchanged |
| Apple identities | 0 | 0 | unchanged |
| profiles | 153 | 158 | unchanged |
| claims | 37 | 49 | unchanged |
| roster players | 1,633 (1 demo, 0 minors) | 2,196 (1,632 from v1) | unchanged |
| tournaments, matches, results | 10, 393, 343 | none from v1 | not imported (decision) |
| bets, transactions, coin balances | 314, 1,278, 102 | none | dropped |

Two v1 accounts are not in v2 (one most likely deleted on v2; one made on v1 on 9 Oct after the backup). Decision:
leave them. If they ever sign in, they get a fresh account. Do not run `scripts/v1-users-to-resend.mjs --apply`, which
would create both.

### Can v1 users sign in to v2?

Yes, with the same account:
- **Email**: every migrated v1 account is in v2 with the same UUID and a confirmed email. They type the email and get
  the 6-digit code. No passwords move (v2 has none).
- **Google**: v1 and v2 use the **same Google OAuth client** (same client id on both projects, checked read-only).
  Google's `sub` is per Google account, so the 71 copied Google identities match. An account with only an email
  identity is linked by the verified email on the first Google sign-in (automatic linking; manual linking is off).
- **Apple**: new in v2; no v1 identity to carry. Apple with the real email links to the existing account by email.
  With «Απόκρυψη email» Apple gives a relay address and that makes a new, empty account; the comms say to use the
  email or Google they used before.
- Everyone signs in once (different project, no sessions carry).

## 2. Go / no-go (F decides at T-1, 18:00)

Go only if every line is yes:
- [ ] v2 app approved on both stores, held for manual release (App Store) / not yet rolled out (Play).
- [ ] Auth settings checked (section 4): redirect URLs for the web app's domain, `host.exp.Exponent` removed.
- [ ] Fresh backups of both projects exist and their SHA256SUMS check (section 3, step 1).
- [ ] The comms email is approved in Greek and English and the Resend audience is ready.
- [ ] `main` protection and the Vercel branch switch are understood (section 4); rollback owner agreed (section 6).

## 3. Timeline and steps

| When | Who | Step | Time |
|---|---|---|---|
| T-7 | F | Comms 1 (section 7). | 30 min |
| T-1 | F | Go / no-go. | 15 min |
| T-0 07:00 | F | Step 1: backups. | 20 min |
| T-0 07:20 | C | Step 2: read-only checks. | 5 min |
| T-0 08:00 | F with C | Section 4: git, deploys, stores, auth settings. | 30 min |
| T-0 09:00 | F | Comms 2. | 10 min |
| T+1 to T+7 | C | Watch: Sentry, PostHog sign-ins, support mail. Hotfixes go to `main`. | |
| T+14 | F | Pause the v1 Supabase project (section 5). | |
| T+90 | F | Delete the v1 project after the archive check (section 5). | |

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
Storage buckets are not in these dumps; v1 photos are not migrated, so nothing to copy.

### Step 2. Read-only checks (C)
```bash
node tools/migrate/v1_inventory.mjs 2026-10-09T08:13:51Z   # v1 still frozen: 0 changes
supabase --workdir .supabase-v2 db query --linked -f tools/migrate/sql/verify_cutover.sql
```
In `verify_cutover.sql`, only the account, profile, founding-frame and coin-column rows apply now (the v1 match
rows read 0 by decision). The founding frame is never given by migration (PR #283: it is for Pro founding members
only; `--grant-founding-frame` is not used).

## 4. Git, deploys, stores, auth (T-0 08:00, F with C)

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

Auth settings to fix on v2 before release (F, Supabase dashboard; read only today):
- `site_url` is `https://app.netprophet.gr` and the redirect list has `netprophet://auth/callback` and
  `https://netprophet.gr/auth/callback`. Set them to where the web app lives at launch (netprophetapp.com or
  another domain), or Google on the web will not return.
- Apple client ids include `host.exp.Exponent` (Expo Go). Remove it for production.

## 5. Retiring v1

- T-0: v1 is already frozen in practice (no web app, no writes since 9 Oct). F may also set v1 auth «Disable new
  sign ups» so nothing new lands there.
- T+14: pause the v1 project (Supabase dashboard). Pausing keeps everything and can be undone.
- T+90: delete it (founder decision of 13 Oct), only after: the T-0 v1 backup restores into a scratch database, an
  encrypted offline copy exists in two places, and the dropped data (tournaments, matches, results, bets,
  transactions, coin balances, email logs) is in that copy. CLAUDE.md's "never deleted" is about the code, which
  lives on in `netprophet-v1`.
- MailerLite: v1 groups and automations off; v2 groups as in implementation-plan 8.3.

## 6. Rollback

No data changes at cutover, so there is nothing to undo in the database. Worst case, restore the T-0 v2 dump.
Git: the merge to `main` is undone with `git revert -m 1 <merge>` in a PR, or by pointing Vercel back at `v2`.
Stores: halt the phased release (App Store) or the rollout (Play). There is no v1 to go back to: its web app and
Vercel projects are gone.

## 7. Comms (F sends, C drafts)

- T-7, email 1 to the Resend audience «NetProphet v1 users» (`scripts/v1-users-to-resend.mjs` without `--apply`
  creates nothing; the audience step needs `--apply`, which would also create the two missing accounts, so F adds
  the contacts on Resend directly or C splits the script first). Draft, Greek first:
  - Θέμα: «Το NetProphet αλλάζει στις {ημερομηνία}»
  - Το νέο NetProphet βγαίνει σε iPhone, Android και web. Μπαίνεις με το ίδιο email (σου στέλνουμε κωδικό) ή με το ίδιο
    Google. Ο λογαριασμός σου και το προφίλ σου είναι ήδη εκεί.
  - Τα νομίσματα και οι παλιές προβλέψεις δεν περνάνε στο νέο app. Ξεκινάμε όλοι από την αρχή, με σερί και level.
  - Αν μπεις με Apple, διάλεξε «Κοινοποίηση email», για να βρεις τον λογαριασμό σου.
  - English: "NetProphet is changing on {date}. Sign in with the same email (we send a code) or the same Google
    account; your account and profile are already there. Coins and old picks do not move over."
- T-0 09:00, email 2: store links, «Είμαστε live».
- The founder reviews every line (copy rules: Greek first, no betting words, «level», no em dashes).

## 8. Import tooling (kept, not used at cutover)

`tools/migrate/` keeps the v1 matches import, fixed and tested in the dry run, in case the decision changes:
`import_roster_matches.sql` (tie-break-only sets as 7-6, the latest of duplicate result rows, merged players via
`core.current_player`, past tournaments finished, never-played matches void), `mirror_hosted_players.sql`,
`export_v1_matches.sh`, `verify_cutover.sql` and `tools/migrate/test/run.sh`. The dry run gave 388 of 393 matches and
335 of 343 results, with no side effects on notifications, outbox, flags or badges.

`import_users_claims.sql` / `export_users_claims.sql` were also fixed: a second run used to reset every v1 user's
name, locale, role, onboarding and claim status and re-claim released players; now they fill only accounts the same
run creates and skip taken emails. They are not run at cutover.
