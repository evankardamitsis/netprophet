# Level algorithm v1

Every player's level comes from three things: where they start, the matches they play, and what the crowd thinks
before each match. The app shows the level in halves («level 4», «level 4,5») and a direction (↑ = ↓); Pro also sees the value
(«4,23»). Version 1, 12 Oct 2026. The numbers below are defaults, stored per sport in `sports.config.rules.level`
and tunable without code.

## The value

- **Scale:** NTRP-like, 1.0 to 7.0. Shown in halves and never rounded up: 4.37 shows as «level 4», 4.5 as «level 4,5».
- **Start:** the player's `initial_level` (NTRP from v1 or set by staff). Without one: 3.0.
- **Matches:** only matches that count for levels (confirmed, `counts_for_levels`), oldest first. Walkovers do not
  count (nobody played); retirements do.
- **Each match** moves both sides like Elo:
  - expected score for a side: `E = 1 / (1 + e^(-(R_side - R_other) / scale))`, `scale = 0.6`
    (half a level better wins about 70% of the time);
  - actual score: a win is `1`, a loss `0`; a 2-1 and a retirement count the same as a 2-0;
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

## Decided (founder, 12 Oct 2026)

1. Imported players with an NTRP rating are `active` from day one at that value.
2. A new player shows a level after 3 counting matches or 10 votes on their matches.
3. Levels go in halves and never round up (4.37 is level 4, 4.5 is 4,5).
4. Every win counts the same (`twoOneScore` = 1; still tunable).
5. Results first (13 Oct 2026): a level is moved by match results; the crowd is felt but small. It counts only on
   matches with 10+ votes and then at a quarter of that match's move (`crowdWeight` 0.25), so it can tilt a level
   but never carry it. Revisit the number once real votes come in.
