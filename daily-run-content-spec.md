# Daily Run — content, supply and onboarding

Companion to `daily-run-port-spec.md`. That one covers porting the prototype's
shell. This one covers filling it with real questions.

Written against three decisions taken after the first draft:

- **No bets, anywhere.** The coin-and-stake economy is retired. Points, streaks,
  multipliers and shields are the whole economy now.
- **Areas, not clubs.** Players move across clubs and tournaments through the
  year; the club is not their identity, the area is.
- **Results arrive twice a week, from selected categories, as a weekly pool** —
  not daily. This is the constraint that shapes everything else.

Nothing here changes the isolation rules of the port branch. It is still
`lib/daily/`, still behind a provider — the difference is a second provider that
reads Supabase instead of `mock.ts`.

---

## 1. What the backend has

Checked against `packages/lib/src/types/database.ts` and the migrations.

| Source | What it gives you |
|---|---|
| `players` | `ntrp_rating`, `wins/losses`, `last5`, `current_streak`, `streak_type`, `surface_win_rates` (Hard/Clay/Grass with per-surface wins/losses/matches), `age`, `hand`, `aggressiveness`, `stamina`, `consistency`, `injury_status`, `seasonal_form`, `last_match_date`, `photo_url`, plus the doubles mirror |
| `matches` | both players (and both doubles pairs), `tournament_id`, `category_id`, `round` (R64 → Finals), `start_time`, `status`, `match_type`, and `odds_a`/`odds_b`. **Not** `winner_id` — the column exists but is empty on every row |
| `match_results` | **`winner_id`, populated on every row — this is where the winner lives.** Per-set scores and per-set winners, tiebreak scores, super-tiebreak, and a `match_result` shorthand (`2-0`, `2-1`, `0-2`, `1-2`, plus `ret`). `total_games`, `aces_leader_id` and `break_points_count` exist but are empty on every row |
| `head_to_head` | `player_a_wins`, `player_b_wins`, `total_matches`, `last_match_date`, `last_match_result` |
| `tournaments` | `name`, `location`, `organizer`, `surface`, `format`, dates |
| `tournament_categories` | `gender`, `age_min/max`, `skill_level_min/max` — the axis the twice-weekly upload selects on |
| `calculateOdds` | a win-probability model over player stats, in `packages/lib/src/odds/` |
| Vercel cron | already wired with `CRON_SECRET` (`CRON_SETUP.md`) |

**Legacy after the pivot — do not build on these:** `bets`, `parlays`,
`transactions`, power-ups, the coin wallet, and the `bet_stats` /
`parlay_stats` / `safe_bet_token_stats` views. See §7.

**Not there:** no club affiliation on players (correct — see §6.3), no
region/area concept beyond free-text `tournaments.location`, no per-player serve
stats (aces and double faults exist per *match*, not per player per season).

### 1.1 Odds survive the pivot, silently

`calculateOdds` is a prediction model over player stats, not a crowd-derived
betting line. It stays, as a **private expectedness signal** that drives §4.2 —
it is how the generator knows a result was surprising. It is never shown, and
the word **απόδοση is on the banned list** (§5.3). Name it
`expectedWinProbability` inside `lib/daily/` so nobody is tempted.

---

## 2. The supply problem

This is the crux, and it is arithmetic.

**Demand:** 7 days × 8 cards = **56 cards per week**.

**Supply:** two uploads a week, selected categories. Call it 12–25 finished
matches. Yield from a finished match:

| Card kind | Yield |
|---|---|
| `result` — who won | 1 per match, but only where the outcome wasn't a foregone conclusion (§4.2) |
| `score` — how it ended | 1 per match, needs `match_results` set scores |
| `upset` — which was the shock | 1 per ~3 matches |
| `combo` — pick two winners | needs **upcoming fixtures**, not results |

At 15 matches a week, with roughly 60% clearing an interest floor, that is
**~21 event-tier cards against a demand of 56.** The remaining 35 come from:

- **Derived** — standing stats: `order` (rank three players), `guess`
  (clue-based identify), rapid-round true/false. Unlimited supply, but it reads
  like a quiz and goes stale as a *feeling* long before it goes stale as a fact.
- **Opinion** — `poll`, `award`, `thisThat`. Unlimited, never wrong, never
  stale. Also the shock absorber for a thin week.

That puts opinion cards at roughly a third of every run. Workable, but it is the
ceiling — past that the run stops feeling like a game about real tennis.

### 2.1 Five consequences, all of them concrete

**a) Ration the pool.** If Monday burns the six best matches, Sunday gets
scraps. The generator scores every event fact once per upload and then
*distributes* across the days until the next upload, reserving a floor of event
cards per day. Running dry mid-week degrades to derived and opinion — never to a
repeat.

**b) One match can carry more than one card.** The abundant-pool rule ("at most
one card per match") is wrong here. Revised: **at most one card per match per
run, at most three across the week, and never the same card kind twice.** A
match can be a `result` on Tuesday and feed an `upset` on Friday.

**c) "Χθες" has to go.** With twice-weekly uploads a result may be five days
old. Every template must use a relative day or a tournament frame — *"την
Κυριακή στη Γλυφάδα"*, *"στον ημιτελικό της Κηφισιάς"* — never *"χθες"*. The
prototype's `Προημιτελικός · 2 ώρες 14 λεπτά` kicker assumes same-day entry and
needs rewriting.

**d) The upload must include upcoming fixtures, not just results.** The `combo`
card — 40 points, the biggest in the deck, the one that resolves on the hub two
days later — needs future `matches` rows with `start_time` and no result. If the
twice-weekly upload is results-only, the best card in the game cannot be built.
This is an operational ask with a direct product cost.

**e) Category selection is a content decision.** Uploading one category's
matches means a week of cards about the same twenty players. Rotating categories
across uploads widens the cast and is worth more to the feature than depth in
any one draw.

### 2.2 Measured, 2026-09-05

Run against production, read-only. The numbers change the plan in several places.

| | | |
|---|---|---|
| **Players** | 1.633 | 1.517 with a match, 627 with five or more, 307 with a populated `last5` |
| **Matches** | 393 | 2026-01-17 → 2026-07-08, across 9 tournaments |
| **Finished** | 342 | over 23 active weeks |
| **Weekly rate** | **mean 14,9 · median 15** | range 3–40 |
| **Singles / doubles** | 227 / 166 | **42% of the pool is doubles** |
| **Finished singles** | **190** | ~8 a week — the pool the current card types can actually use |
| **Odds** | **100% populated** | median gap 0,69; 114 matches lopsided by more than 2,0 |
| **Results** | 343, `winner_id` on all | 87 went to a super-tiebreak (25%) |
| `total_games`, aces, break points | **0%** | the columns exist and are empty |
| **Head-to-head** | 184 pairs | 175 have met once, 8 twice, **1 more than that** |
| **Rounds** | 70% labelled | 116 of 393 have no `round` |

#### What it means

**Eight cards is supportable in season — but only if doubles counts.** At a
median of 15 finished matches a week the §2 arithmetic works. Take doubles out
and it is **190 singles over 23 weeks, about 8 a week**, under the gate and an
argument for a five-card run.

So the most valuable thing in this measurement: **doubles support is not a
nice-to-have, it is the difference between a five-card run and an eight-card
one.** The schema already carries it — `match_type`, the `player_a1/a2` and
`player_b1/b2` slots, and a full doubles stats mirror on `players`. It is also
pre-paid work for padel (§8.7.1), which is doubles by nature.

**The season has the shape §8.3.1 assumed.** January to April runs 13–40 matches
a week; May and June taper to 3–9; and there has been **nothing since
2026-06-26, ten weeks ago**. The local dead season is July–September — precisely
Wimbledon and the US Open. The slam calendar patches the exact hole the local
calendar has.

**The surprise signal works today.** Odds are populated on every match, median
gap 0,69, with 114 clear favourites. That is the 0,35 weight in §4.2 — the most
important input to picking a good card — available immediately, no new pipeline.

**The closeness signal does not.** `total_games` is empty on every row, as are
aces and break points. Rebalance §4.2 to take closeness from the scoreline
instead, which *is* there: `match_result` distinguishes `2-0` from `2-1`, and
`super_tiebreak_score` marks the matches that went the distance.

**The format is two sets plus a champions tiebreak,** not best of three.
`set3_score` is used once in 343 rows; `super_tiebreak_score` is used 87 times,
holding scores like `17-15`. The prototype's `score` card copy — *"2-1 με
ανατροπή από 0-1"* — assumes a third set. Options and distractors have to speak
the real format.

**Head-to-head is effectively empty.** Of 184 pairs, 175 have met exactly once.
That removes the `h2h` fact kind for now, and it is a real problem for the
scouting report in §8.4 — see the note there.

**The pipeline is not running.** Ten weeks without a row. Everything above is
downstream of that, and no amount of generator quality substitutes for it.

## 3. Architecture

```
lib/daily/
  providers/
    mock.ts            unchanged — still the fixture, still the default
    supabase.ts        the real provider, same shape
  content/
    facts.ts           derive checkable claims from a snapshot. No Greek.
    interest.ts        score a fact 0..1
    schedule.ts        weekly pool -> daily runs (§2.1a)
    distractors.ts     plausible wrong answers per card kind
    compose.ts         pick the run
    validate.ts        the quality gate
    greek.ts           declension, caps, numbers, dates
    templates/         one file per card kind: Greek surface only
```

The separation that matters: **`facts.ts` produces language-free structured
claims; `templates/` turns a claim into Greek.** A fact is testable without
touching a string; a template is reviewed once instead of per card.

```ts
interface Fact {
  id: string;
  kind: 'result' | 'setScore' | 'streak' | 'surfaceEdge' | 'h2h'
      | 'upset' | 'ranking' | 'ageExtreme' | 'fixture';
  subjects: string[];          // player ids
  value: unknown;              // the answer, computed now
  computedAt: string;
  validUntil: string | null;
  source: { table: string; ids: string[] };
  interest: number;
}
```

**Pin every answer at generation time.** *"Ο Σταύρου έχει ενεργό σερί νικών"* is
true on Monday and false on Wednesday. A card must store the answer *and the
numbers it was computed from*, with a `validUntil`. Cards are generated into an
immutable `daily_cards` table and never recomputed on read.

`source` is not decoration — when a tester reports a wrong question you need to
get from the card back to the rows in one step.

---

## 4. Making the questions good

### 4.1 Crowd splits, without bets

`bets` held real crowd predictions. It is going away, and it should not be
back-filled from: staked coins and free daily answers are different populations
answering a different question, and building the new feature's credibility on
retired-product data is a bad trade.

Instead the crowd is **the Daily Run's own answers**, which means a cold start.
The structural fix is the one the prototype already hints at with
*"214 ψήφοι · κλείνει σε 6 ώρες"*:

- **Poll and award cards run open for a day**, and the split is revealed the
  following day. Voting *is* the mechanic; the delay is the feature.
- **Scoring cards accumulate answers over their lifetime.** Show the split only
  above a threshold — 20 answers is a reasonable floor. Below it, **show
  nothing**. A missing percentage costs nothing; an invented one costs the
  feature's credibility the first time a tester does the arithmetic.

### 4.2 Interest scoring

Correct is the floor. Interesting is the product. Every candidate fact is
scored; the scheduler takes the top of each bucket:

```
interest =
    0.35 × surprise      // |expectedWinProbability − outcome|, from calculateOdds.
                         //   A heavy favourite losing is the best card of the week.
  + 0.20 × closeness     // from `match_result` (2-1 beats 2-0) and whether a
                         //   super-tiebreak was needed. NOT total_games — that
                         //   column is empty on every row (§2.2).
  + 0.15 × recency       // ~10 day half-life — longer than daily, because the pool is weekly
  + 0.15 × stakes        // round (Finals > R64) + category prestige
  + 0.10 × novelty       // penalise players featured in the last few runs
  + 0.05 × disagreement  // crowd split closeness once §4.1 has data; zero at cold start
```

Then multiply by **proximity** for the specific player: 1.0 baseline, ×1.6 if a
followed player is involved, ×1.3 for their area, ×2.0 if they played the match.
Proximity is the cheapest quality lever available and it multiplies effective
supply — two users get different runs from the same thin pool, which matters
enormously at 15 matches a week.

### 4.3 Deck composition

A run is assembled, not sampled:

- exactly **1 combo**, when forward fixtures exist (§2.1d)
- **2–3 opinion** cards
- **3–4 scoring** cards, at least 2 from the event tier when supply allows
- at most one card per match per run (§2.1b)
- at least one card touching a followed player, when possible
- never a repeat, never past `validUntil`
- vary the answer shape — not three `OptionList` cards in a row

### 4.4 Distractors decide whether a card is any good

A `score` card is only as good as its wrong answers. Perturb the real scoreline
rather than inventing one: swap the set order, collapse a comeback to straight
sets, turn a tiebreak into a break. Then:

- never a distractor that is **also true** (a different valid way of writing the
  same result)
- never two distractors that mean the same thing
- same shape and length as the answer — a longer, more specific option is a tell

`validate.ts` rejects a card whose distractor set fails any of these.

---

## 5. Greek, and the review loop

### 5.1 The nominative rule

Greek surnames decline, and that is where templates fall over:

| Ending | Nominative | Accusative | Genitive |
|---|---|---|---|
| -ου | Γεωργίου | Γεωργίου | Γεωργίου |
| -ος | Καραμάνος | τον Καραμάνο | του Καραμάνου |
| -ας | Παππάς | τον Παππά | του Παππά |
| -ης | Βασιλάκης | τον Βασιλάκη | του Βασιλάκη |
| female | Γεωργίου | (invariant) | (invariant) |

**Design every data-driven template so the name appears only in the nominative,
or on a card of its own.** *"Ποιος κέρδισε στην Κηφισιά;"* with two player cards
needs no declension at all. That is why the prototype reads well, and it should
be a hard rule rather than an accident.

Where an oblique case is unavoidable, `greek.ts` gets a helper covering those
four endings plus female-invariant — roughly 95% of Greek surnames — and
`validate.ts` flags any name it cannot decline confidently. `greek.ts` also owns
`greekCaps()` (already written — Greek drops accents in all-caps), numerals in
words, and `el-GR` dates.

### 5.2 The review loop

A daily check-in with corrections feeding back is the right instinct, and it
**changes the earlier recommendation.** The first draft said write the copy
patterns by hand and add a model later, because an unreviewed generator is a
liability. With a human gate in front of publication that risk disappears, so
the model can do the writing from the start.

```
upload -> generate candidates -> review queue -> approved -> daily_cards -> players
                    ^                  |
                    |                  v
              few-shot corpus <-- corrections
```

1. **Generate** after each upload, into `daily_cards` with `status: 'draft'`.
   One batched call over the run's cards. The model sees only the structured
   fact — numbers and nominative names — and returns the question, the options
   and a ≤2-sentence explanation.
2. **Review** — an admin screen showing the day's cards rendered exactly as the
   player will see them, with the fact and its provenance beside each. Actions:
   approve, edit, reject with a reason, regenerate.
3. **Capture** every edit as `(fact, generated, corrected, reason)`.
4. **Feed back.** Those tuples become the few-shot corpus for the next run,
   newest and most-corrected first, alongside a rules file that grows from the
   reject reasons.

**On "the model learns":** with a few hundred Greek examples this is retrieval,
not training. A growing few-shot corpus plus an explicit rules file beats
fine-tuning here — it is instantly updatable, it is inspectable, one bad example
can be deleted, and it costs nothing extra. Fine-tuning becomes worth
considering in the low thousands of corrected examples, which is a year away at
56 cards a week. Worth saying plainly so nobody waits for a model that is
quietly improving on its own.

**Earning autonomy.** Track edit rate per template. When a template's cards go
N consecutive runs without a text edit, auto-approve that template and surface
only exceptions. The reviewer moves from approving everything, to approving the
templates that have not yet earned trust, to handling flags. That is a
measurable path to hands-off rather than a hope.

**Cost.** ~56 cards a week, batched into two calls, is cents a month — the model
is not the expense. The **review screen is**, and it is worth building properly
because it is also the debugging tool for everything in §4.

### 5.3 The linter

`validate.ts` runs on every card and blocks publication on failure:

- **Banned vocabulary** — κέρδη, δελτίο, κουπόνι, παρολί, στοίχημα, τζόγος,
  ποντάρισμα, and **απόδοση** in the odds sense. Non-negotiable after the pivot.
- **Copy fixes stay fixed** — reject σεριού, δίδυμο, "το καρφί", εκκρεμή,
  "report", ανατροφοδότηση
- Latin characters in Greek copy, except names and tournament titles
- **"χθες" and same-day framing** (§2.1c)
- an answer not derivable from the stored fact
- distractor failures per §4.4
- a `validUntil` already past, or missing `source` provenance

Every rejection is logged with the fact that produced it. That log is the
fastest read on where the generator is weak, and it is the raw material for the
rules file in §5.2.

---

## 6. Onboarding

Current flow: welcome → play type → claim → club → friends. It never explains
the game, the club step has no data behind it, and it asks for friends before
the player has a reason to care.

### 6.1 New flow

1. **Welcome** — unchanged.
2. **Πώς παίζεται** — new, §6.2.
3. **Play type** — unchanged.
4. **Claim** — unchanged (tournament players only).
5. **Area** — replaces club, §6.3.
6. **Follow players** — reframed as "who do you want to see first", skippable.

Then straight into the first run. The rest is taught by playing.

### 6.2 Draft copy for the new screen

New Greek, not ported. Written to be reviewed by a native eye before it ships.

> **eyebrow:** Βήμα 1 από 4
> **tagline:** Πώς παίζεται
>
> - Οκτώ παιχνίδια τη μέρα. Πέντε λεπτά όλα κι όλα.
> - Πραγματικά ματς τένις από τα ερασιτεχνικά ταμπλό της Αθήνας, με ονόματα που
>   ήδη ξέρεις.
> - Άλλα τα ξέρεις, άλλα τα μαντεύεις, σε άλλα λες απλώς τη γνώμη σου.
> - Κάθε σωστή απάντηση ανεβάζει τον πολλαπλασιαστή. Κάθε μέρα που παίζεις
>   κρατάει το σερί σου.
>
> **button:** Συνέχεια

It says tennis plainly and promises nothing else. Keep the type names
sport-neutral in code anyway (`GameCard`, not `TennisCard`) — it costs nothing.

### 6.3 Area replaces club

Confirmed by the pivot: players move across clubs and tournaments through the
year, so the club is not their identity. Area is, and it is the axis the
proximity multiplier in §4.2 actually needs.

Ask for one of: **Βόρεια προάστια · Νότια προάστια · Κέντρο · Δυτικά προάστια ·
Πειραιάς · Ανατολική Αττική**, mapped from `tournaments.location` through a small
lookup table so "τα ματς κοντά σου" works from day one. Drop the club leaderboard
from the Κατάταξη tab; area and overall are enough.

---

## 7. What the bets pivot breaks

Not this branch's job to fix, but it lands on the same product and someone
should be holding it:

- **The leaderboard has no source.** `get_weekly_leaderboard_stats` computes
  `FROM bets`. Ranking must be rebuilt on Daily Run answers — points from
  finished runs, over a rolling window. The Κατάταξη tab is on mock data today
  and this is what it needs to point at.
- **Existing coin balances.** Users hold coins bought with real money through
  Stripe. Retiring the economy is a decision with a refund/goodwill dimension —
  worth deciding deliberately rather than by deletion.
- **The `/matches` prediction-slip UI** is the old game. Whether the Daily Run
  replaces it or sits beside it during transition is a product call that affects
  how isolated this branch stays.
- Power-ups, parlays, safe-bet tokens and the transaction ledger all become
  legacy surface.

---

## 8. Monetisation

Organiser and club revenue is off the table — there are too few of them and they
run their own thing. This has to be paid for by players, and it has to feel like
part of the game rather than a tollbooth in front of it.

### 8.1 The arithmetic, first

Worth being blunt before designing anything. Take an optimistic 2,000 monthly
actives in year one:

| Model | Conversion | Per user | Annual |
|---|---|---|---|
| Monthly sub at 2,99 € | 3% | ~30 € | ~1,800 € |
| Season pass at 6,99 €, 4 seasons | 10% | ~28 € | ~5,600 € |
| Cosmetics, on top | — | ~2 € | ~1,000 € |
| Scouting one-offs | 15% of the ~300 tournament players | ~4 € | ~1,200 € |

Two things fall out of that table. **A season pass out-earns a subscription
roughly three to one at this scale**, because a one-off purchase converts far
better than a recurring commitment for a five-minute-a-day local game. And
**audience size, not conversion tuning, is the lever that matters** — doubling
the players doubles the revenue, whereas doubling conversion on a small base
moves very little. The free game being good and shareable is a monetisation
decision.

### 8.2 The principle

> The game is free forever. You pay to progress, to look like yourself, and to
> go deeper into the data.

Three things follow, and they are hard rules:

- **Never sell anything that moves a player up the ranking.** A ranking that can
  be bought is not a ranking, and the whole point of this pivot is to be
  somewhere gambling is not.
- **Split the two currencies.** Rank the leaderboard on **accuracy** — correct
  answers over scoring cards — not on points. Points stay a personal progression
  currency that pass tracks, multipliers and shields all feed. This is worth
  doing for its own sake: accuracy is the honest answer to the game's own
  question, *"ξέρεις την τοπική σκηνή καλύτερα από όλους;"*, whereas points
  mostly measure who showed up most. It also settles the awkward case in the
  prototype where a 0,99 € streak shield protects a multiplier that feeds the
  ranking. With the two separated, boosts and shields become freely sellable
  because they cannot touch the thing being competed over.
- **Never paywall the daily run.** It is the retention engine; charging for it
  kills the thing that makes everything else sellable.
- **Meter the data, do not wall it.** A free player gets the player pages the
  questions require. Depth is rationed by credits, not locked behind a gate — a
  meter feels chill, a wall feels hostile.

### 8.3 The headline: a season pass, not a subscription

Replace the prototype's 4,99 €/month with **Πάσο Σεζόν** — a track you progress
along by playing, tied to the tennis calendar.

Why this and not a subscription:

- **It converts better.** A single purchase against a defined thing is a much
  easier yes than an open-ended monthly charge, especially in Greece.
- **It is chill.** No churn anxiety, no cancel flow, no feeling of paying rent on
  a game. It expires and you decide again.
- **It is game-like by construction** — it *is* a mechanic, not a pricing page
  bolted on.
- **It fixes the Pro screen.** The prototype's twelve-row comparison table is an
  enterprise pricing page inside a five-minute game. A track you can see yourself
  moving along is the right screen.

### 8.3.1 Four seasons, anchored to the pro calendar

Four seasons of roughly three months, each built around a Grand Slam. This is a
good idea for reasons beyond theming:

- **The calendar is already in everyone's head.** No need to teach a rhythm that
  Greek tennis players already feel.
- **Surface alignment is real content.** The clay season is the clay season for
  both tours. Surface-specific questions and stats become seasonally relevant
  instead of arbitrary.
- **It is four, not six.** A 90-day track needs about thirteen weekly milestones
  — that is producible. Six or eight seasons a year is a content treadmill a
  small team will not sustain.
- **Pro tennis fills the local off-season.** This is the strongest argument and
  it is easy to miss: the periods when Athens amateur tennis goes quiet —
  August, deep winter — are exactly when the US Open and the Australian Open are
  on. The slam calendar patches the two holes in the local calendar. It is also
  a direct answer to the supply problem in §2: during a slam there are two weeks
  of matches the whole country is watching, needing no admin upload at all.

**Two wrinkles to decide deliberately:**

*The slams are not evenly spaced.* Roland Garros and Wimbledon are about six
weeks apart, and there is a four-month gap between the US Open and the Australian
Open. Four equal quarters do not map onto four slams. The honest split is by
**swing**, which is how tennis actually thinks about its year:

| Season | Period | Anchor |
|---|---|---|
| Σεζόν Σκληρού | Jan–Mar | Australian Open |
| Σεζόν Χώματος | Apr–Jun | Roland Garros |
| Σεζόν Γρασιδιού | Jul–Sep | Wimbledon, then the US Open |
| Σεζόν Κλειστών | Oct–Dec | the indoor swing and the ATP Finals |

*Do not name seasons after the tournaments.* "Wimbledon", "Roland Garros",
"Australian Open" and "ATP" are trademarks. Name the seasons by surface and
swing, reference the tournaments freely inside content, and keep them out of the
branding and the store.

**Check the split against the local calendar before committing.** When does the
Athens scene actually go quiet? If August is dead and the pass spans Jul–Sep,
you are selling three months of which one is empty — unless the pro content is
deliberately weighted to carry it, which it can.

### 8.3.2 How much pro tennis

Seasoning, not the main dish. One or two of the eight daily cards during a slam,
zero or one otherwise.

The reason is competitive, not editorial: **pro results are a commodity.** Every
tennis app on earth has them, and a generic tennis quiz competes globally and
loses. The defensible thing here is that nobody else has Athens amateur data.
Pro content is the seasonal spike and the off-season patch — the moment it
becomes the product, the product has no moat.

A slam is also the natural season finale: a free-entry bracket on the pro draw,
scored in points, is high engagement at zero admin cost.

Worth pricing before committing: this needs an ATP/WTA results feed, which is a
new dependency and probably a recurring cost. Check what a reliable one costs
before the calendar depends on it.

### 8.3.3 On requiring the pass to play

The proposal is that the pass gates the game itself. My recommendation is **no,
not yet** — keep the daily run free and sell the pass as progression. The
reasoning, and then the version where the gate wins:

**The gate is easy to add later and very hard to remove.** Going from free to
paid is a normal product decision. Going from paid to free tells everyone who
already bought that they overpaid, and it is a refund and goodwill problem. If
it is genuinely unclear, the reversible order is free first.

**There is no other acquisition engine.** The daily run is both the retention
engine and the top of the funnel. A game you cannot open cannot be shared, and
word of mouth is the only realistic growth channel in a market this size. A
paywall in front of an unproven local product loses the large majority of people
who would have tried it.

**It breaks leagues, which are the retention plan.** A private leaderboard where
three of your six training partners have not paid does not work. §8.6 is the
mechanism that makes the pass worth buying in the first place; gating the game
disarms it.

**Free users cost almost nothing here.** The card pool is generated once and
shared — a free player's marginal cost is storage and bandwidth. There is no
economic pressure to gate, only a psychological one.

**6,99 € as a hard gate is the worst of both worlds.** It is high enough to block
the funnel and low enough not to compensate for the people it blocks. If the game
is genuinely gated, the audience is small and committed by definition, and it
should be priced accordingly — 9,99–12,99 € a season. Pick one: cheap and open,
or gated and priced for it. Cheap and gated captures neither.

**If the gate is the decision anyway**, the least-bad version is not a trial but
a **free first season for every new account.** Seven or fourteen days is not
enough — a daily habit takes about a month to set, and a player who has not
formed the habit will not renew. Give a whole season, gate from the second. That
keeps the funnel open, keeps leagues intact within a cohort, and still makes the
pass the core purchase.

### 8.4 The stack around it

A small audience needs several small purchase moments, not one large ask.

**Cosmetics (the long tail).** The procedural portraits are already a generative
system — frames, palettes and badges cost close to nothing to produce and rotate.
This works disproportionately well here: the leaderboard shows people you
actually play against, so identity has real social value in a scene this size.
Direct purchase only — see §8.5.

**Scouting report, one-off, ~1,99 €.** A dossier on one player: surface splits
over time, form curve, recent results by round.

**Caveat from §2.2: the head-to-head half of this does not exist.** 175 of 184
pairs have met exactly once. *"How do I match up against him"* is the most
compelling line in the pitch and there is no data behind it yet. What remains —
form, surfaces, recent results — is real but thinner than the feature was sold
on. Either it launches without H2H and says so plainly, or it waits for another
season of results. Worth knowing before pricing against it. This is the highest-intent
purchase in the product because it attaches to a real moment — the week before
you face someone. A tournament player buying two a year is worth more than most
subscribers. Pass holders get credits; everyone else can buy one.

**Consumables, 0,99 €.** Streak insurance, an extra rapid round. Already designed
in the prototype. Low value each, near-zero friction, and they are the first
purchase most people make.

### 8.5 What not to sell

- **No randomised paid rewards.** No loot boxes, no gacha, no mystery packs.
  This product is deliberately walking away from betting; selling randomised
  outcomes for money would be tone-deaf, and it is regulated as gambling in a
  growing number of places. Cosmetics are bought directly, for a known price,
  and you see what you get.
- **No advantage.** Covered in §8.2 and worth repeating because a season pass
  makes it tempting.
- **No interrupting the run.** Whatever else happens, the eight cards are never
  broken up by a sales moment.

### 8.6 Leagues are the engine underneath all of it

The highest-leverage thing to build is not a payment screen — it is **παρέες**:
private leaderboards for your training group, your regular fourball, the people
from your club's Saturday ταμπλό. Free to create, free to join.

In a scene where everyone knows everyone, competing against five named people
you actually play beats competing against a city-wide list. It drives daily
return, daily return drives pass progression, and pass progression is what makes
the pass worth buying. Leagues do not need to be monetised themselves; they make
everything else sellable. Season-pass holders getting league history and stats is
enough of a pull.

### 8.7 Suggested prices, to be tested

| | Price | Note |
|---|---|---|
| Πάσο Σεζόν | **6,99 €** | ~3 months, four a year; the headline |
| Ετήσιο πάσο | **19,99 €** | all four seasons up front — three seasons' price for four |
| Scouting report | **1,99 €** | one player, one-off |
| Cosmetic item | **0,99–2,99 €** | direct purchase, rotating |
| Streak insurance / extra round | **0,99 €** | consumable |

### 8.7.1 Getting to viable

Low prices and a small city do not reach a salary. Worth being explicit about the
gap, with the caveat that these are estimates with wide error bars — the point is
the shape, not the decimals.

Stacking §8.4 on top of the pass gives roughly **4,50 € per active user per
year**: ~2,80 € from the pass at 10% conversion, plus cosmetics, scouting and
consumables. Against a target of one full-time salary, call it 40.000 €:

| Audience | Plausible actives | At ~4,50 €/user/yr |
|---|---|---|
| Athens tennis only | 1.500–3.000 | 7k–13k € |
| Greece-wide tennis | 5.000–8.000 | 22k–36k € |
| Greece-wide tennis **+ padel** | 10.000–15.000 | 45k–67k € |

**Athens-only tennis cannot fund this.** That is the honest read, and it means
the volume instinct is right. There are two levers and they multiply.

**Lever one: more people, and the cheap version is geography, not sport.**
Thessaloniki, Patras, Crete — then Cyprus, which is the same language and needs
no translation at all. Same engine, same schema, same question templates, same
Greek. The only new input is tournaments. Compare that to a new sport, which
needs a new rating system, new templates, new copy, a new community and a new
data pipeline. **Expand sideways before expanding across.**

**When it is time for a second sport, it should be padel.** Not football, not
basketball — and the reason is structural rather than a preference:

- **Amateur tennis works as a data source because it is already structured.**
  Tournaments have draws, someone runs them, results get recorded, players have
  ratings. That is not incidental — it is why this product is possible at all.
  Amateur 5-a-side football has no draws, no organisers keeping records and no
  NTRP equivalent. The pipeline does not exist to plug into.
- **Padel has the same structure**, the same clubs, the same tournament format,
  and largely the same people — a great many Athens tennis players are already
  playing it.
- **The schema already supports it.** `matches.match_type` is
  `'singles' | 'doubles'`, the doubles player slots exist, and `players` carries
  a full doubles stats mirror. Padel is doubles. This is close to free.

Basketball is tempting in Greece and would be a real audience, but amateur
basketball is team-rostered rather than individual, which breaks the "a player
you actually know" hook that the whole question set rests on.

**Lever two: raise revenue per user, which is the more controllable one early.**
Going from 4,50 € to 9 € per user per year halves the audience needed. That is
what §8.4 is for, and it is why the accuracy/points split in §8.2 matters — it is
what makes a catalogue of small purchases safe to sell.

Low-friction purchases worth building, roughly in order of confidence:

| | Price | Why it works |
|---|---|---|
| Scouting report | 1,99 € | highest intent in the product; attaches to a real moment |
| Portrait frame / palette | 0,99–2,99 € | procedurally near-free; the leaderboard shows people you actually play |
| Title beside your name | 0,99 € | pure status, trivial to build, tight community |
| Streak insurance | 0,99 € | safe to sell once ranking is on accuracy |
| Extra rapid round | 0,99 € | already designed |
| Season summary, shareable | 1,99 € | end-of-season "Η σεζόν μου" card — also a growth loop |
| Gift a pass or a cosmetic | — | small revenue, real acquisition in a scene this size |

### 8.7.2 Access revenue — noted, not recommended

Worth writing down so it is a decision on the record rather than a blank spot in
six months.

**The observation.** An amateur player already spends real money to *play* —
entry fees, court hire, coaching. `tournaments.entry_fee` is in the schema. Five
tournaments a year at ~20 € is ~100 € already leaving their pocket for tennis,
while everything above is designing a way to ask for ~28 € a year to read about
it. The money is already moving through this scene; it is not moving through us.

**How big, honestly.** At 2.000 actives with perhaps 300 tournament players
entering five events a year, a 1–2 € booking fee is **1.500–3.600 € a year**,
against roughly 9.000 € from the content stack. Comparable, not dominant. It only
becomes the larger number if the app becomes the registration channel for the
whole Greek scene, including people who never play the game — which is a
different company, not a feature.

**A distinction worth keeping.** "Organisers pay us" is dead, and rightly — it
asks them for money to solve a problem they do not have. The different ask is:
**organisers pay nothing, players pay a small fee at registration, and organisers
get free tooling** — entries handled, draws generated, no thread of sixty people
on WhatsApp. That is a benefit rather than a cost, which is an easier
conversation. It may still be a no; "they do their own thing" is usually about
control rather than money.

**One access idea needs nobody's cooperation:** partner matching. Claimed
profiles, NTRP ratings and areas are already being collected. *"Ψάχνω παρτενέρ
4.0 στα βόρεια"* is a real and frequent need built entirely from data this
product already holds.

**Why none of it is recommended now.** Every version is a different product —
payments, refunds, disputes and draw management, or a matching marketplace. Each
is a larger build than the daily game and would compete for the attention that
has not yet proved the loop holds. Revisit once it has.

**What to do about all this now:** nothing structural. Build tennis in Athens,
prove the loop, and keep the code sport-agnostic and region-agnostic — no
`TennisCard` types, no hardcoded Αττική. The expansion levers stay cheap as long
as nothing hardcodes the assumption that there is one sport and one city.

### 8.8 Test order

1. **Consumables first.** They already exist in the prototype, they need no new
   surface, and they tell you whether anyone will pay anything at all.
2. **Scouting report.** One screen, real utility, highest intent. Also the
   fastest read on whether "detailed analytics" is genuinely wanted or just
   sounds good.
3. **Season pass.** Only after the run has held testers for a full season's
   length — a pass sold against a game people quit in week two is a refund queue.
   Launch it ungated (§8.3.3) and instrument conversion; the gate stays available
   as a later decision if the free tier genuinely converts nobody.
4. **Cosmetics.** Once there are enough players for the leaderboard to be worth
   dressing for.

One honest note to sit alongside this: at a few thousand local players, consumer
revenue funds part of a person, not a team. A local sponsor — a stringer, a
racquet shop, a court booking service — placed somewhere that never interrupts
the run is the realistic complement, and it scales with audience rather than with
conversion. Worth holding as a known gap rather than discovering it later.

## 9. Rollout, and retiring the old app

### 9.1 The branch merges cleanly — merge it now

`feat/daily-run` is two commits ahead of main and zero behind: a fast-forward.
Of ~44 changed files only three touch existing code — `CLAUDE.md`,
one word in a regex in `middleware.ts`, and a `test` script in `package.json`.
Everything else is new files under `app/(prototype)/`, `lib/daily/`,
`components/daily/` and two hooks.

Merging today changes nothing for a single existing user. `/daily` simply exists,
unlinked, and already carries `robots: { index: false, follow: false }`.

**Merge before building the content system, not after.** `facts.ts`, the Supabase
provider and the review screen are far more work than the port was. Right now it
is a zero-conflict fast-forward; forty commits from now, against a moving main,
it is a rebase nobody wants.

### 9.2 Never rewrite main

The instinct to move `main` to an `old-version` branch and replace it is the
wrong mechanic. Production deploys from main, so rewriting its history costs the
deployment record and the ability to roll back to a known-good build. Four stale
branches — `feature/doubles` (77 behind), `athlete-photos` (62), `teams` (57) —
become much harder to ever land. Every clone breaks. Blame stops crossing the
transition.

Main moves forward. The pivot is a sequence of ordinary, revertible commits.

### 9.3 Archived, not deleted — and git already does this

**Deleting a file in a commit does not lose it.** Git keeps the whole history;
`git show v1-betting:path/to/file` and `git checkout v1-betting` both work
forever. Removing the old surface from the working tree *is* archiving it, as
long as there is a named point to get back to.

So: **tag, do not branch.**

```bash
git tag -a v1-betting -m "Last commit before the Daily Run pivot"
git push origin v1-betting
```

A tag is immutable and free. Use a branch (`release/v1`) only if you actually
need to *ship fixes* to the old app during the transition — branches are for
ongoing work, tags are for reference points.

**What not to do: move the old code into an `archive/` directory in the repo.**
Dead code in the working tree goes stale, pollutes every grep and search,
confuses future sessions about what is live, bloats the build and eventually gets
imported by accident. The repo should contain the app; git contains the history.

**If the archive needs to be *browsable* rather than recoverable** — someone
wanting to look at the old app running, not read its source — pin a Vercel
deployment to the `v1-betting` tag on a subdomain. That is a far more useful
archive of a product than a folder of source nobody opens.

### 9.4 The phases

1. **Merge.** `/daily` exists, unlinked, noindexed. Nobody affected.
2. **Closed test.** Testers get the URL. Still unlinked. This is where you find
   out whether the loop holds — everything after is contingent on it.
3. **Build the new shell** around the proven loop (§9.5).
4. **Cut over.** Tag `v1-betting`, then remove the old surface in ordinary
   commits. Migrate balances, repoint the leaderboard, retire the betting crons.

### 9.5 The whole UI and marketing site is replaced

Nothing of the current site carries over into the new one. The Daily Run's design
system — the ember/amber palette in `lib/daily/tokens.ts`, the scoped stylesheet,
the card and sheet language — is the app's design system now, not a prototype
skin. Its route group stops being `(prototype)` and becomes the root.

The current surface is 33 routes. They do not all fall into the same bucket:

| | Routes | Disposition |
|---|---|---|
| Product | matches, my-picks, rewards, results, leaderboard, players, tournaments, my-profile | **Replaced.** The betting surface is the old game |
| Marketing | landing, how-it-works, faq, help-center, contact | **Rewritten.** They currently sell a prediction-and-coins product that will not exist |
| Legal | terms, privacy, cookies, rules (duplicated across app and marketing) | **Rewritten, not discarded.** These almost certainly describe a coin economy, purchases and betting mechanics. They are wrong the day the pivot ships, and they are the one category with legal exposure |
| Auth | signin, register, callback, reset, forgot, profile-setup | **Plumbing.** Restyled, not rebuilt |

Three things that follow, worth deciding rather than discovering:

**`CLAUDE.md` is now actively misleading.** It is ~1.300 lines instructing any
agent to build the "Night Court" design system — gold `#FFD60A`, neon green,
MatchCards, the prediction slip, coin balance pills, ΔΕΛΤΙΟ renames. That is the
app being retired. Left as-is it will misdirect every future session. It should
be gutted down to the Daily Run direction at the same time the shell is built —
before, ideally.

**The isolation rule needs a deliberate ending.** `lib/daily` currently may not
import from the app; that inverts when the daily version *is* the app. Plan the
moment the scaffolding comes down — `(prototype)` becomes the root group,
`lib/daily` becomes `lib/` — rather than letting the rule quietly erode until
nobody knows what it means.

**Both languages stay.** Decided: `el` and `en`, permanently. The Greek has to be
genuinely good; the English has to be correct. What that costs is §9.6 — it is
not free, and most of the cost lands on the content generator rather than the
UI.

**Redirects.** Whatever marketing URLs are indexed today should 301 to their
replacements rather than 404. Cheap to do at cutover, impossible to recover
later.

### 9.6 Bilingual, and what it actually costs

The UI chrome is the cheap half. The generated content is where bilingual gets
interesting, and it is worth being precise about which costs are real.

**Cheap:** English has no declension and no accent-stripping in caps, so the
whole of §5.1 — the hardest part of the Greek — has no English equivalent. The
`greek.ts` work does not double.

**Roughly 2×:** templates. Each of the ~20 templates needs an `el` and an `en`
variant. They are written once and reviewed once, so this is a fixed cost, not a
per-card one.

**Marginal, not 2×:** LLM generation. One call produces both languages from the
same structured fact — the fact context dominates the token count, so a second
language is a small increment on the output, not a second call.

**Asymmetric:** review. Greek gets read carefully every time. English can be
spot-checked, because the failure modes are milder and more obvious. But the
linter (§5.3) must run on **both** — the banned vocabulary has English
equivalents that are just as wrong after this pivot: *winnings, slip, coupon,
parlay, bet, stake, odds*.

#### Player names are the real problem

The English UI exists mostly for people who play amateur tennis in Athens but do
not read Greek. Showing them *"Ν. Καραμάνος"* on a card and asking who won is
unusable — they cannot read either option.

`players` stores one `first_name`/`last_name` pair, in Greek. So:

- **Transliterate at render for `en`**, using ELOT 743 — `Καραμάνος` →
  `Karamanos`. A sibling to `greek.ts`, deterministic, no schema change, no admin
  burden.
- **Allow an override later.** Many Greeks have a passport spelling that differs
  from the standard. An optional `latin_name` column solves it when someone
  complains; consistency beats officialness until then.
- Do **not** show Greek script inside English copy. It defeats the point of
  having an English locale at all.

#### Where the language lives

For now: **in state, not in the URL.** `/daily` stays unlocalised and noindexed,
and the locale is a field on `DailyState`, defaulted from `navigator.language`
and changeable in settings alongside the haptics toggle.

The daily run is an app, not a set of pages — there is no SEO to win from a
locale segment on a noindexed route, and staying out of `[lang]` keeps the
middleware exemption and the isolation rule intact. This gets revisited when the
scaffolding comes down (§9.5) and the daily run becomes the app proper under
`[lang]`.

#### The copy layer has to come first

There are already **341 hardcoded Greek fragments** across the ported components.
Every component built from here doubles the eventual retrofit, so the copy layer
is step zero of the build, not a later refactor:

```
lib/daily/copy/
  el.ts        every string, typed
  en.ts        the same keys
  index.ts     useCopy() — reads the locale from DailyState
```

Shape it like the app's existing `src/dictionaries` so the two merge cleanly when
the isolation ends. Keep it inside `lib/daily/` for now — importing the app's
dictionary system would break the zero-coupling rule while it is still doing its
job.

## 10. Build order

0. **The copy layer** (§9.6). 341 Greek strings are already hardcoded and every
   new component adds more. Cheapest it will ever be is now.
1. ~~**Measure.**~~ Done — §2.2. Median 15 finished matches a week in season,
   but only ~8 of them singles.
1a. **Doubles-aware cards.** The measurement's headline: 42% of the pool is
   doubles, and without it the run is five cards rather than eight. `PlayerRef`
   and the `result` card both assume one player a side. This moves to the front
   of the queue, and it is the same work padel needs later.
2. **`greek.ts`** — caps, dates, declension, unit tested. Everything depends on it.
3. **`facts.ts` + `providers/supabase.ts`** — read-only, snapshot-pinned, behind
   the same interface as `mock.ts`. The mock stays the default so the prototype
   keeps running with no database.
4. **`validate.ts`** before any generator ships. A linter written afterwards
   never gets written.
5. **The review screen**, with two card kinds end to end — `result` and `score`,
   from real data. Stop here and read the output for a week. If the Greek is not
   good at two kinds it will not be good at nine.
6. **`interest.ts` + `schedule.ts`** — scoring and the weekly-pool rationing.
7. **Remaining kinds**, two or three at a time.
8. **Cron** after each upload, plus the rejection log and the edit-rate metric
   that earns autonomy.
9. **Onboarding** §6 — independent of all the above, can land any time.
10. **Consumables and the scouting report** (§8.8) — the two cheapest reads on
    whether anyone pays. Both can run against the current prototype without
    waiting for the generator.

Two things sit outside this order and should happen sooner than their position
suggests: **merge the branch now** (§9.1), and **gut `CLAUDE.md`** (§9.5) before
it misdirects another session into building the old design system.

Steps 1–5 answer the only question that matters yet: can this produce a question
a Greek tennis player enjoys reading? Everything after is scale.
