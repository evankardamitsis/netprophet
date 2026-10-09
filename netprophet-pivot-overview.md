# NetProphet — the pivot, end to end

Written 2026-10-02. This is the overview; the three specs below carry the
detail. Read this first, then whichever spec covers what you are about to touch.

---

## 1. What the pivot is

| | Before | After |
|---|---|---|
| Product | Coins-and-predictions betting app | A daily game about the Athens amateur tennis scene |
| Loop | Build a slip, stake coins, collect winnings | Eight cards a day, answer, reveal, streak |
| Ranking | `get_weekly_leaderboard_stats` computed `FROM bets` | Accuracy; points are a separate progression currency |
| Revenue | Coin purchases via Stripe | Season passes + Pro analytics, paid by players |
| Content | Scores uploaded for many matches daily | A twice-weekly pool, rationed across the days |

Driving constraints the user set, none of them derivable from the code:

- **No betting, no gambling vocabulary, in either language.** Enforced by a
  linter, not a convention.
- **Never sell advantage.** No purchase may move anyone up the leaderboard.
- **Tournament organisers will never pay** — too few of them, and they run their
  own thing. Revenue has to come from players: simple, chill, game-like.
- **Clubs barely matter; areas do.** Players move across many clubs a year.
- Elo-like rating is for **players of the game**, never for tennis rankings.
- Both languages permanently. English is easy; the Greek has to be genuinely
  good, and ported Greek strings are source of truth — not to be "improved".
- At cutover the old site goes entirely, but is **archived, not deleted.**

---

## 2. Artifacts

| File | Lines | What it is |
|---|---|---|
| `netprophet-app-demo-v7.html` | 1.036 | The standalone prototype the port came from. Reference for behaviour and for Greek copy. |
| `daily-run-port-spec.md` | 284 | Porting the prototype into the app. Steps 1–9 complete, plus the rapid bonus round. |
| `daily-run-content-spec.md` | 1.010 | Real questions, the bilingual copy layer, onboarding, monetisation, rollout. §1 backend inventory · §2 supply · §4 question quality · §5 Greek + review loop · §6 onboarding · §8 monetisation · §9 rollout |
| `CLAUDE.md` | 139 | Rewritten from a ~1.300-line spec for the retired betting UI, which was actively misdirecting sessions into rebuilding it. Old version recoverable at `git show ccd28f9:CLAUDE.md`. |
| `supabase/migrations/20260906090000_create_daily_cards.sql` | — | `daily_cards` + `daily_card_edits`, RLS locked to the service role. Deployed. |
| `supabase/migrations/20260906140000_guard_match_result_coherence.sql` | — | Trigger rejecting match results that contradict themselves. Deployed. |

The game itself: **~9.300 lines across 67 files** in `apps/web/src/lib/daily`,
`apps/web/src/components/daily` and `apps/web/src/app/(prototype)`.

---

## 3. Git state — read this before anything else

| Ref | At | Meaning |
|---|---|---|
| `origin/main` | `ccd28f9` | **The old betting app, untouched.** This is the archive point. |
| local `main` | `d98d8c3` | **16 pivot commits, none of them pushed.** |
| `feat/daily-run` | `07df701` | Stale, an ancestor of main |
| `origin/feat/daily-run` | `6fe6b69` | Stale — the bonus-round commit, early in the work |

**The pivot was committed onto local `main`, not onto the feat branch.** That
contradicts the plan as stated ("all of this is on a feat branch"), and it means
sixteen commits of work exist on one machine only. Worth resolving early.

It does make the archive simpler, though: `origin/main` is still exactly the old
app, so `v1-betting` can be tagged at `ccd28f9` and `old-version` branched from
it, with no history surgery.

On top of that, **16 files are uncommitted** (10 modified, 6 new):
`actions.ts`, `answers/crowd.ts`, `content/publish.ts`, `content/facts.test.ts`,
`copy/copy.test.ts`, `scripts/regenerate-order-cards.mts`.

---

## 4. What has been built

**The game** — all nine card kinds (`result`, `score`, `poll`, `upset`, `order`,
`guess`, `thisThat`, `award`, `combo`), plus a rapid bonus round. Onboarding,
hub with four tabs, run shell, scoring with combo multipliers and streak
shields, a risk choice (keep / half+shield / double), a scratch-to-reveal
canvas, celebrations and haptics. Phone-first, fluid to two columns at 1080px.
Every colour in `tokens.ts`, stylesheet built from it, nothing hard-coded.

**The content pipeline** — how a real question gets made:

    Supabase snapshot
      → facts.ts        checkable claims, no language at all
      → interest.ts     ranked: surprise .35, closeness .20, recency .15,
                        stakes .15, novelty .10, disagreement .05
      → templates/      Greek and English, nominative-only to avoid declension
      → validate.ts     banned vocabulary, Greek linting, distractor checks
      → schedule.ts     dealt round-robin across the days to the next upload
      → daily_cards     drafts, awaiting human review
      → review screen   approve / edit / reject, corrections recorded
      → approvedForDay  only approved cards ever reach a player

`templateHealth` measures the per-template edit rate — that is the autonomy
gate. A template whose cards go run after run untouched earns the right to skip
review. Without a number, "eventually it does it on its own" stays a hope.

**Safety rails** — a review screen authenticating as a real admin rather than a
shared secret; the coherence trigger at the database edge; 92 unit tests across
7 files (scoring, greek, interest, validate, schedule, facts, copy).

---

## 5. What the real data supports

Measured against production, which is what corrected the spec:

| Measurement | Finding |
|---|---|
| Finished matches per week | median **15** |
| Of those, singles | only ~**8** — doubles support is what makes an 8-card run possible |
| Usable facts | **311** (was 4 before the `is_hidden` fix) |
| Doubles facts | **93** (was 9 before the discipline fix) |
| Candidates per generation run | **484**, 1 rejected |
| Set-score orientation | **159 of 159** rows with per-set winner ids agree with a side-A-first reading — unambiguous |
| Coherence trigger, dry-run | rejects exactly **2** of 343 rows, accepts 341 |

The supply finding is the one that shaped the architecture: results arrive twice
a week, so a run is **not** "today's matches" — it is a ration of a pool. If
Monday takes the eight best matches, Sunday gets scraps. Hence `schedule.ts`,
its one-card-per-match rule and its cap of two cards per answer shape.

---

## 6. Data integrity — the columns that lie

| Column | State |
|---|---|
| `players.win_rate` | **Unusable.** Of 1.517 players with a record: 481 correct, 917 silently zero, 119 wrong but non-zero. ΤΣΟΝΑΚΗΣ is 8W-4L stored as 100%. Fixed: `winRate()` derives from `wins`/`losses`. |
| `clay_win_rate` / `hard_win_rate` | **Dead.** 675 of the 679 players with clay matches sit at 0, and there are no per-surface win columns to derive from. **Unfixed** — surface bars read 0%. |
| `wins` / `losses` | Singles only. Doubles has its own mirror columns. |
| `matches.winner_id` | Empty on every row. The winner is on `match_results.winner_id`. |
| `is_hidden` | Means *unclaimed*, not "hide this player". Filtering it out cost 307 of 311 usable facts. |
| `current_streak` | Disagreed with `last5` on at least one player. Noticed, not chased. |

**The structural lesson, worth more than any single fix:** contradictory rows
are about **twice as likely** to score as "surprising" (14% vs 7%). A scorer
that rewards surprise therefore promotes bad data to the top of the review
queue. Integrity checks have to live in the fact layer, never in review — by
review time the bad row is already the most attractive one on the page.

That failure actually shipped: all 8 approved `order` cards printed wrong
percentages and **3 of 8 had the wrong correct answer**, which would have marked
a player's correct answer wrong. They have since been retired and regenerated.
`rankingFacts` also gained `minMatches = 8`, because a derived rate with no
volume floor puts 3-0 players above a 49-5 player.

---

## 7. Monetisation

Settled in conversation, detail in content spec §8:

- **Four season passes a year**, aligned to the Grand Slam calendar, ~**6.99€**
  each — amateur seasons mirroring the pro tour.
- A low price means revenue needs **volume** (other sports eventually, which the
  player never needs told about) **and/or small "low thinking" purchases.**
- **Pro** sells very detailed player and tournament analytics.
- Nothing purchasable may affect the leaderboard.

---

## 8. Rollout

Content spec §9. Keep `origin/main` as the archive, tag `v1-betting` at
`ccd28f9`, branch `old-version` from it, then cut over. The tag belongs **at
cutover, not before.**

Needs rebuilding rather than deleting: `get_weekly_leaderboard_stats` (computes
`FROM bets`, and moves to accuracy anyway) and the legal pages, which describe a
coin economy and carry real exposure the day the pivot ships. Users hold coin
balances bought through Stripe — retiring that is a decision, not a deletion.

Legacy to leave alone: `bets`, `parlays`, `transactions`, the wallet, power-ups,
safe-bet tokens, the `/matches` slip, the reward shop, the coins marketing.

---

## 9. Where it stands

| locale | status | detail |
|---|---|---|
| el | approved | 2026-09-07..09-10: 4 / 4 / 5 / 3 (result + upset only) |
| el | draft | 8 regenerated `order` + 4 `score` — **awaiting review** |
| en | draft | 32, never reviewed |
| en | rejected | 8 (the retired order cards) |

**Check today's date against `scheduled_for` before assuming anything serves.**
Ranking facts carry a 7-day `valid_until`; if the date has moved past the window
above, the pool is expired and needs republishing, not debugging.

`scripts/regenerate-order-cards.mts --apply` **has already been run.** It
retired 16 rows and republished drafts. Do not run it again.

---

## 10. Open, in the user's order

1. **Resolve the git situation** — 16 unpushed commits on local `main`
2. User reviews the 8 Greek `order` drafts
3. **The cron** — call `publish()` after each upload, `CRON_SECRET` pattern
4. **Onboarding §6** — a "Πώς παίζεται" screen, area replaces club, reframed
   follow-players step
5. Full UI and marketing overhaul; Pro / monetisation build
6. **The scraper, last** — the user will provide detailed instructions
7. Longer-term: templates for the remaining card kinds, an LLM colour layer with
   a few-shot corpus fed by the correction trail

Smaller: the surface bars; `club: ''` on real players may render a dangling
separator in `hub.players.sub`; the `current_streak` / `last5` disagreement.

---

## 11. Rules and environment

**Hard rules.** No gambling vocabulary — `validate.ts` blocks κέρδη, δελτίο,
κουπόνι, παρολί, στοίχημα, τζόγος, ποντάρισμα, απόδοση (odds sense), and
winnings/slip/coupon/parlay/bet/stake/odds. Greek drops accents in all-caps:
`greekCaps()`, never `toUpperCase()`. `\b` does not match Greek in JS regex —
use `(?<!\p{L})…(?!\p{L})` against `stripAccents()`. Zero coupling: nothing in
`lib/daily` or `components/daily` imports from the rest of the app, with one
documented exception for `components/daily/review/`.

**Environment.** The shell resets to `~`; work in `apps/web`. Scripts run with
`npx tsx` must live inside `apps/web` and be `.mts`. Dev server: `preview_start`
with name `netprophet`, port 3050 — the `launch.json` is outside `apps/web`, do
not add another. Tests: `npx vitest run` in `apps/web`. The permission
classifier blocks Supabase writes from throwaway probe scripts but allows a
committed one.

**Working with the user.** Commit only when asked. Do not suggest things that
contradict the plan already written down. Stop driving the browser when they say
they are walking the flow themselves. Do not over-verify.
