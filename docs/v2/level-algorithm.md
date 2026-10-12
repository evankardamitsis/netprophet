# Level algorithm v1

Every player's level comes from three things: where they start, the matches they play, and what the crowd thinks
before each match. The app shows a whole number («level 4») and a direction (↑ = ↓); Pro also sees the value
(«4,23»). Version 1, 12 Oct 2026. The numbers below are defaults, stored per sport in `sports.config.rules.level`
and tunable without code.

## The value

- **Scale:** NTRP-like, 1.0 to 7.0. Shown as the nearest whole number (3.5 shows as 4).
- **Start:** the player's `initial_level` (NTRP from v1 or set by staff). Without one: 3.0.
- **Matches:** only matches that count for levels (confirmed, `counts_for_levels`), oldest first. Walkovers do not
  count (nobody played); retirements do.
- **Each match** moves both sides like Elo:
  - expected score for a side: `E = 1 / (1 + e^(-(R_side - R_other) / scale))`, `scale = 0.6`
    (half a level better wins about 70% of the time);
  - actual score: a win is `1.0` for 2-0 and `0.85` for 2-1 (a retirement counts as 2-1), a loss is `1 - that`;
  - change for each player: `K × (S - E)`, with `K` starting at `0.4` and falling to `0.1` over the first 10 matches
    (new players find their level fast, settled ones move slowly);
  - doubles: a side's rating is the average of its two players, and both players get their own change.
- **Crowd:** when a match had at least 10 votes, the vote split is a second, softer result. Each vote counts by the
  voter's accuracy (their right calls over resolved votes, pulled towards 50% when they have few:
  `(right + 1) / (resolved + 2)`). The side's weighted share `C` adds `0.25 × K × (C - E)`.
- **Traits** («Πώς σε βλέπουν») get a weight of 0 until traits voting exists.

## What shows

- **Status:** a player is `active` once they have an `initial_level`, 3 counting matches or 10 votes on their matches.
  Before that they are `pending` and show no level («Το level σου θα το βγάλει το κοινό»).
- **Direction:** today's value against the value 7 days ago: `+0.10` or more is ↑, `-0.10` or less is ↓, else =.
  No history yet: =.
- **Υποτιμημένος** (upset index, kept for a later label): the share of a player's wins where the crowd had picked
  the other side (10+ votes).

## How it runs

- A full recompute from scratch every night at 03:30 Athens time (`core.recompute_levels`), so corrections,
  disputes and merges are picked up with no special handling. Staff can run it from admin.
- One snapshot per player per day in `level_snapshots` (value, tier, direction, the counts used,
  `algo_version = 1`).
- The math lives twice: `packages/core/src/rules/level.ts` and `core.level_compute(jsonb)`. Both run the same JSON
  vectors (`packages/core/test-vectors/levels.json`).

## Decisions for the founder

Defaults are in place; say if any should change.

1. Imported players with an NTRP rating are `active` from day one at that value (otherwise every roster card would
   stay empty until they play three matches here).
2. A new player shows a level after 3 counting matches or 10 votes on their matches.
3. Whole numbers round to the nearest (3.5 shows as 4).
4. A 2-1 win counts a little less than a 2-0 (0.85 against 1.0).
5. The crowd counts for a quarter of a match, weighted by how often each voter is right.
