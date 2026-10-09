# @netprophet/core

Game rules and domain types for NetProphet v2. Pure TypeScript: no IO, no clock, no randomness. Time is always passed in as an ISO 8601 instant, and every period key (day, week, month) is computed in `Europe/Athens`, DST included. The server (edge function, one transaction per user) and tests both call this package, so it is the single source of the rules.

```ts
import { resolveBatch, validateVote, recordVoteCast, evaluateUnlocks, canSee } from '@netprophet/core';
```

## Rule table

| Area | Rule | Where |
|---|---|---|
| Points | Correct vote +10. Correct Ανατροπή call +30 (replaces the +10). +5 chain bonus on a correct vote that extends a chain. «Οι 6 της ημέρας» completed +30, once per quiz day (set changes 09:00 Athens), same for the 12-card Pro set. Money and Pro never add points. | `rules/points.ts` |
| Ανατροπή | The winner had under 40% of the votes, with at least 10 votes cast. | `isUpset` |
| σερί | Consecutive correct votes. A wrong vote resets to 0 unless a freeze absorbs it. Milestones 3, 5, 7, 10. Personal record kept (`best`). | `rules/streak.ts` |
| Freezes | Max 2 held. Free: the first at σερί 3, then one every 15 votes cast. Paid (0,99 EUR): a purchase. Free keeps the number and the chain; paid keeps the number only and restarts the chain. | `rules/streak.ts` |
| Order | σερί advances in RESOLUTION order: `resolvedAt`, then vote `createdAt`, then vote id. A later correction never rewrites the σερί. | `compareResolutions` |
| Void/cancelled | Vote closes with outcome `none`: no points, σερί, chain and freezes unchanged. Only `confirmed` matches with a result resolve; `played`, `disputed` and the rest stay pending. | `rules/resolution.ts` |
| Double resolution | A vote with `resolvedAt` set, or a repeated vote id in one batch, is `already_resolved`. Ledger keys (`<ref>:<reason>`) are idempotent. | `resolveVote` |
| Vote lock | Only `announced` or `scheduled` matches, strictly before `lockAt` (default `startsAt`). A vote at exactly the lock instant is rejected. One vote per match. | `validateVote` |
| Quests | 3 daily (reset 00:00 Athens): vote 3 cards, give a kudos, vote on 2 matches. 2 weekly (reset Monday 00:00 Athens): log 2 matches, be active 5 different days. Plus the invite quest (0, 1 invite sent, 2 friend joined and played). Rewards are a cosmetic (if not owned) or a badge bonus. There is no points reward in the type. | `rules/quests.ts` |
| Active day | 3 cards voted or a match logged, per Athens day. | `rules/activity.ts` |
| Progress bar | Quests: a step event on every counted step. Badges: only when one step from the next tier. Celebrations only on completion, reward or unlock. | `applyQuestEvent`, `applyBadgeCounter` |
| Unlock ladder | 13 steps, each with an action trigger and a backup trigger in votes cast. Sticky. `existingPlayer` unlocks all. | `rules/unlocks.ts` |
| Ladder | Monthly, resets on the 1st (Athens). Groups of 20 in Χάλκινη, Ασημένια, Χρυσή. Top 5 promote (not above Χρυσή), positions 16 to 20 relegate (not below Χάλκινη), top 3 get the frame and badge. Scopes: league, friends, area. | `rules/leaderboard.ts` |
| Pro (8,99 EUR/month) | Flags: 12 quiz cards, tournament alerts, opponent scouting, deep stats, level numbers, win cards, season recap. `canSee(feature, entitlement, now)`. Waitlist (fake door) grants nothing. | `rules/entitlements.ts` |
| Tennis | Best of 3, totals 2-0 or 2-1, per-set games from the winner side, sets 6-0..6-4, 7-5, 7-6, deciding set may be a match tiebreak. Lives in `sports/tennis.ts`; other sports fall back to a generic adapter. | `sports/tennis.ts` |

## Test vectors

`test-vectors/*.json` are language-neutral: `{ suite, version, groups: [{ fn, cases: [{ name, input, expected }] }] }`. Instants are ISO 8601 strings; no language-specific types. `src/vectors.test.ts` maps each `fn` to the TS function. The SQL implementation should map the same `fn` names and run the same files.

| File | Covers |
|---|---|
| `points.json` | points per vote, upset threshold, quiz award, quiz day boundary (09:00) |
| `streak.json` | milestones, both freeze kinds, 15-vote freeze, stacking limit, breaks |
| `quests-time.json` | day/week/month keys and next resets, incl. DST 2026-03-29 and 2026-10-25 |
| `quests.json` | quest progress, window resets, distinct days, invite steps |
| `unlocks.json` | action triggers, vote backups, stickiness, existing players |
| `votes.json` | lock boundary, closed statuses, offsets |
| `resolution.json` | out-of-order resolution, double resolution, void, pending, upset |

In `streak.json` a step with `repeat: N` means N identical steps.

## Decisions to confirm

The spec is silent or ambiguous here; the simplest consistent choice was made.

Status: **enforced in both places** means the TypeScript rules and the SQL rules (`supabase-v2/migrations/*_core_rules_parity.sql`) give identical results, checked by `supabase-v2/tests/80_parity.test.sql` against `test-vectors/`. **TS only** means the database does not implement that rule yet. Decisions 1 to 6 and 8 to 10 are exercised by shared vectors; the others are marked by what the database does.

1. **Upset (Ανατροπή):** a correct call is an upset when the winner had under 40% of votes and at least 10 votes were cast. It pays +30 in total, not +10 plus +30.
   _Enforced in both places. SQL: `core.is_upset`, defaults in `core.sport_rules` and `sports.config -> rules` (`upset_share_max` 0.40, `upset_min_votes` 10)._
2. **Chain bonus:** a flat +5 on every correct vote that follows at least one correct vote in the chain (not escalating).
   _Enforced in both places. SQL writes the +5 as its own `chain` ledger row; the per-vote total equals core's._
3. **Free freeze counter:** counts votes cast (at vote time, match votes). When both slots are full the counter waits at 15 and the freeze is granted on the first cast with a free slot (not lost).
   _Enforced in both places. SQL counts in `api.cast_vote` through `core.record_vote_cast`, not at resolution._
4. **First free freeze at σερί 3:** granted once, only if a slot is free; otherwise it is tried again the next time σερί reaches 3.
   _Enforced in both places. SQL grants it only at exactly σερί 3 and sets the flag only when a slot was free._
5. **Which freeze is spent first:** the free one (it keeps the chain), then the paid one.
   _Enforced in both places (`core.apply_outcome`: free first, then the oldest paid)._
6. **Wrong vote at σερί 0:** no freeze is spent.
   _Enforced in both places. SQL no longer spends a freeze or logs a break for a wrong vote at σερί 0._
7. **Quiz and σερί:** quiz and dynamic card answers do not touch σερί or freezes. They count for the "vote cards" quest and the active day.
   _TS only. The database has no quiz or dynamic-card answer RPC yet; the quiz award and day key exist as `core.quiz_completion_points` and `core.quiz_day_key` and are checked by the points vectors._
8. **Resolution order:** by resolution time, then vote time, then vote id (as the implementation plan recommends). Points land in the Athens month of the resolution time.
   _Enforced in both places (`core.resolve_votes` sorts by resolved time, vote time, vote id; ledger month comes from the resolution time)._
9. **Resolvable matches:** only status `confirmed` with a result. Admin-entered results must be saved as `confirmed` by the server.
   _Enforced in both places. `api.resolve_match` leaves any other status pending; void and cancelled close their votes with outcome `none`._
10. **Lock:** `lockAt` defaults to `startsAt`; a vote at exactly the lock instant is rejected.
   _Enforced in both places (`core.vote_gate`; the lock instant is `locked_at`, else `starts_at`, and a vote at exactly that instant is rejected)._
11. **Unlock backups:** the spec gives vote-count backups only for steps 10 (30) and 13 (45). Others chosen: 2: 5, 3: 8, 4: 12, 5: 15, 6: 25, 7: 20, 8: 35, 9: 28, 11: 40, 12: 50. Step 5 "first result after day 2" is `votesResolved >= 1` and 2 active days.
   _TS only (unlock ladder is not in the database yet)._
12. **Ladder ties:** points, then who reached them first (`lastPointAt`), then user id. Players with 0 points never promote or get awards. Groups under 16 players relegate nobody.
   _TS only (monthly ladder is not in the database yet)._
13. **Pro status:** active until `endsAt` (null is open ended); gifted weeks run until `giftUntil`.
   _Not vector-checked. `api.get_me` reads Pro the same way (active until `ends_at`, null is open ended); gifted weeks are TS only._
14. **Quest rewards:** reward ids in the default catalogue are placeholders; real ones come from admin config.
   _TS only._
15. **Corrections:** an admin score change does not rewrite σερί (per the plan). Compensating ledger rows are the server s job and are not modelled here.
   _Not vector-checked. `api.resolve_match` never rewrites σερί, and the database refuses result corrections for now._
