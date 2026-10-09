// lib/daily/content/facts.ts
//
// Derives checkable claims from a frozen snapshot. No Greek, no English, no
// React — a fact is testable without touching a string, which is the whole
// reason this layer exists separately from `templates/`.
//
// Every fact carries the answer computed now, the numbers it was computed from,
// and where those numbers came from. When a tester reports a wrong question you
// need to get from the card back to the rows in one step.

import type {
    MatchRow, PlayerRow, ResultRow, Snapshot, TournamentRow,
} from '../providers/supabase';
import { sideIds } from '../providers/supabase';

export type FactKind =
    | 'result'        // who won
    | 'setScore'      // how it finished
    | 'upset'         // the favourite lost
    | 'ranking'       // order these players by win rate
    | 'award'         // a vote, no right answer
    | 'contrast';     // two players worth arguing about

export interface Side {
    /** joined player ids, stable within a card */
    id: string;
    playerIds: string[];
}

export interface Provenance {
    table: string;
    ids: string[];
}

export interface Fact<V = unknown> {
    id: string;
    kind: FactKind;
    /** player ids the fact is about */
    subjects: string[];
    value: V;
    computedAt: string;
    /**
     * When the answer stops being safe to ask. A finished result never
     * changes, so it is null; anything derived from live standings expires.
     */
    validUntil: string | null;
    source: Provenance;
    /** 0..1, set by interest.ts */
    interest: number;
}

export interface ResultValue {
    matchId: string;
    a: Side;
    b: Side;
    winner: 'a' | 'b';
    /** '2-0' | '2-1' etc, straight from match_results */
    matchResult: string;
    /** true when it went to a champions tiebreak */
    superTiebreak: boolean;
    sets: string[];
    /** the model's expectation for side a, 0..1 — never shown */
    expectedA: number | null;
    round: string | null;
    tournament: string | null;
    surface: string | null;
    playedAt: string | null;
}

export interface RankingValue {
    playerIds: string[];
    /** correct order, best first */
    order: string[];
    /** the win rates the order was derived from */
    values: number[];
}

/** Odds to an implied probability for side a, normalised to remove the margin. */
export function impliedProbability(oddsA: number | null, oddsB: number | null): number | null {
    if (!oddsA || !oddsB || oddsA <= 1 || oddsB <= 1) return null;
    const a = 1 / oddsA;
    const b = 1 / oddsB;
    return a / (a + b);
}

function sideOf(match: MatchRow, which: 'a' | 'b'): Side | null {
    const playerIds = sideIds(match, which);
    if (playerIds.length === 0) return null;
    return { id: playerIds.join('+'), playerIds };
}

function setsOf(result: ResultRow): string[] {
    return [result.set1_score, result.set2_score, result.set3_score, result.super_tiebreak_score]
        .filter((s): s is string => Boolean(s));
}

/**
 * Which side the set scores say won, reading each set as "side a – side b".
 *
 * Null when they are unreadable or tied, which is itself a reason to skip the
 * match rather than guess.
 */
export function winnerFromSets(result: ResultRow): 'a' | 'b' | null {
    let a = 0;
    let b = 0;
    for (const set of setsOf(result)) {
        const [x, y] = String(set).split('-').map((n) => Number.parseInt(n, 10));
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        if (x > y) a += 1;
        else if (y > x) b += 1;
    }
    if (a === b) return null;
    return a > b ? 'a' : 'b';
}

/**
 * Does the recorded scoreline agree with the recorded outcome?
 *
 * Two checks, and the second was added because a reviewer caught what it
 * misses:
 *
 * 1. `match_result` says 2-0 or 2-1; the set columns should say the same thing.
 *    "6-0, [10-3]" is a 2-1 missing its second set.
 * 2. `winner_id` should be the side the sets say won. One match in the first
 *    review batch recorded "3-6, 6-2, [10-5]" — a win for side a — against a
 *    `match_result` of "1-2" and a winner on side b. Whichever field is wrong,
 *    a card built on it names the loser as the winner, which is the worst thing
 *    a card can do.
 *
 * Cheaper to skip the match than to decide which field to believe.
 */
export function scorelineAgrees(result: ResultRow, winner?: 'a' | 'b'): boolean {
    const sets = setsOf(result);
    const outcome = result.match_result?.trim() ?? '';
    if (outcome.includes('ret')) return false;          // retirements read wrong on a card
    if (/^[02]-[02]$/.test(outcome) && sets.length !== 2) return false;
    if (/^[12]-[12]$/.test(outcome) && sets.length !== 3) return false;
    if (!/^[0-2]-[0-2]$/.test(outcome)) return false;

    const fromSets = winnerFromSets(result);
    if (fromSets === null) return false;

    // match_result is written from side a: "2-1" means a won.
    const [aSets, bSets] = outcome.split('-').map((n) => Number.parseInt(n, 10));
    if (fromSets !== (aSets > bSets ? 'a' : 'b')) return false;

    return winner === undefined || fromSets === winner;
}

export type Discipline = 'singles' | 'doubles';

/** Matches played in the discipline being asked about. */
export function played(player: PlayerRow, discipline: Discipline): number {
    return discipline === 'doubles'
        ? (player.doubles_wins ?? 0) + (player.doubles_losses ?? 0)
        : (player.wins ?? 0) + (player.losses ?? 0);
}

/**
 * Win rate as a 0–1 fraction, derived — never read from `players.win_rate`.
 *
 * **That column cannot be trusted.** Of the 1.517 players with a record, it is
 * correct for 481, silently zero for 917, and *wrong but non-zero* for 119.
 * ΤΣΟΝΑΚΗΣ sits at 8-4 with a stored rate of 100%. The wrong values skew
 * extreme, which is exactly what the interest scorer rewards, so the bad rows
 * were being promoted to the top of the review queue and printed on cards as
 * fact. Deriving from `wins`/`losses` costs nothing and cannot disagree with
 * the record shown beside it.
 *
 * Returns null when the player has not played in the discipline — no matches
 * is not the same as losing them all, and a card must not imply otherwise.
 */
export function winRate(player: PlayerRow, discipline: Discipline = 'singles'): number | null {
    const total = played(player, discipline);
    if (total === 0) return null;
    const won = discipline === 'doubles' ? (player.doubles_wins ?? 0) : (player.wins ?? 0);
    return won / total;
}

/**
 * A player is usable in a question if they are real and have enough history in
 * the discipline being asked about.
 *
 * **The discipline matters.** `wins`/`losses` count singles only — doubles has
 * its own mirror. 81 of the 157 players in the doubles pool have no singles
 * record at all, so checking `wins + losses` rejected them as unknowns despite
 * full doubles histories. That alone cut doubles cards from 108 to 9.
 *
 * Deliberately does **not** filter on `is_hidden`. That flag means *unclaimed* —
 * `players.ts` sets it back to true so the claim lookup can find them. 154 of
 * the 155 hidden players have real records; excluding them would mean only
 * asking about people who already use the app, which is backwards for a game
 * about the local scene.
 */
export function isAskable(
    player: PlayerRow | undefined,
    discipline: Discipline = 'singles',
): player is PlayerRow {
    if (!player) return false;
    if (player.is_demo_player) return false;
    if (player.is_active === false) return false;
    return played(player, discipline) >= 3;
}

/** One `result` fact per finished match both of whose sides are askable. */
export function resultFacts(snapshot: Snapshot): Fact<ResultValue>[] {
    const facts: Fact<ResultValue>[] = [];

    for (const { match, result } of snapshot.matches) {
        const a = sideOf(match, 'a');
        const b = sideOf(match, 'b');
        if (!a || !b) continue;

        const everyone = [...a.playerIds, ...b.playerIds];
        const discipline: Discipline = match.match_type === 'doubles' ? 'doubles' : 'singles';
        if (!everyone.every((id) => isAskable(snapshot.players.get(id), discipline))) continue;

        // The winner is one player id; for doubles it identifies the pair.
        const winner = a.playerIds.includes(result.winner_id) ? 'a'
            : b.playerIds.includes(result.winner_id) ? 'b'
                : null;
        if (!winner) continue;

        // Three fields have to tell the same story: the set scores, the
        // match_result shorthand, and winner_id.
        if (!scorelineAgrees(result, winner)) continue;

        const tournament: TournamentRow | undefined = match.tournament_id
            ? snapshot.tournaments.get(match.tournament_id)
            : undefined;

        facts.push({
            id: `result:${match.id}`,
            kind: 'result',
            subjects: everyone,
            value: {
                matchId: match.id,
                a, b, winner,
                matchResult: result.match_result,
                superTiebreak: Boolean(result.super_tiebreak_score),
                sets: setsOf(result),
                expectedA: impliedProbability(match.odds_a, match.odds_b),
                round: match.round,
                tournament: tournament?.name ?? null,
                surface: tournament?.surface ?? null,
                playedAt: match.start_time,
            },
            computedAt: snapshot.takenAt,
            // A finished result is finished. It does not expire.
            validUntil: null,
            source: { table: 'match_results', ids: [match.id] },
            interest: 0,
        });
    }

    return facts;
}

/** The same matches, asked the other way: not who won, but how. */
export function setScoreFacts(snapshot: Snapshot): Fact<ResultValue>[] {
    return resultFacts(snapshot)
        // A scoreline question needs a scoreline.
        .filter((f) => f.value.sets.length >= 2)
        .map((f) => ({ ...f, id: `setScore:${f.value.matchId}`, kind: 'setScore' as const }));
}

/** Results where the model had the loser well ahead. */
export function upsetFacts(snapshot: Snapshot, threshold = 0.65): Fact<ResultValue>[] {
    return resultFacts(snapshot).filter((f) => {
        const { expectedA, winner } = f.value;
        if (expectedA === null) return false;
        const expectedWinner = expectedA >= 0.5 ? 'a' : 'b';
        const confidence = Math.max(expectedA, 1 - expectedA);
        return winner !== expectedWinner && confidence >= threshold;
    }).map((f) => ({ ...f, id: `upset:${f.value.matchId}`, kind: 'upset' as const }));
}

/**
 * Players to put in order. Derived from live standings rather than a finished
 * event, so it expires — records move.
 *
 * Ordered by win rate, not `ntrp_rating`. NTRP is a coarse 3.5 / 4.0 / 4.5
 * scale, so consecutive players tie constantly and the question has no single
 * right answer. A first pass ranked on it and produced zero usable facts.
 */
export function rankingFacts(
    snapshot: Snapshot,
    {
        size = 3,
        validForDays = 7,
        /** adjacent players must differ by at least this, or it is a coin flip */
        minGap = 0.05,
        /**
         * Matches needed before a *rate* means anything.
         *
         * Higher than `isAskable`'s three on purpose. "Who won this match" needs
         * only that the players are real; "who has the better record" needs
         * enough matches for the record to be one. At three, the top of the
         * table is 3-0 players sitting above a 49-5 player, which is arithmetic
         * nobody in the scene would accept. Measured across the pool: at 3 there
         * are four unbeaten thin records, at 5 there are two, at 8 there are
         * none and the table opens 49-5, 8-1, 15-2. Raising it further only
         * costs players — 101 qualify at eight, 83 at ten.
         */
        minMatches = 8,
    }: {
        size?: number; validForDays?: number; minGap?: number; minMatches?: number;
    } = {},
): Fact<RankingValue>[] {
    const askable = [...snapshot.players.values()]
        // Ordered by the singles win rate, so it needs a singles record.
        .filter((p) => isAskable(p, 'singles'))
        .filter((p) => played(p, 'singles') >= minMatches)
        .map((p) => ({ player: p, rate: winRate(p, 'singles') }))
        .filter((x): x is { player: PlayerRow; rate: number } => x.rate !== null)
        .sort((x, y) => y.rate - x.rate);

    const facts: Fact<RankingValue>[] = [];
    const expires = new Date(Date.parse(snapshot.takenAt) + validForDays * 864e5).toISOString();

    // Take players spaced across the table rather than consecutive ones. Three
    // adjacent players in a 200-strong list differ by a fraction of a percent,
    // which is not a question — it is a coin flip with three sides. Striding
    // gives genuinely separated players, and a better question for it.
    const stride = Math.floor(askable.length / size);
    if (stride < 1) return [];

    for (let offset = 0; offset < stride; offset++) {
        const group = Array.from({ length: size }, (_, k) => askable[offset + k * stride])
            .filter(Boolean);
        if (group.length !== size) continue;

        const gaps = group.slice(1).map((x, k) => group[k].rate - x.rate);
        if (gaps.some((g) => g < minGap)) continue;

        facts.push({
            id: `ranking:${group.map((x) => x.player.id).join('+')}`,
            kind: 'ranking',
            subjects: group.map((x) => x.player.id),
            value: {
                playerIds: group.map((x) => x.player.id),
                order: group.map((x) => x.player.id),
                values: group.map((x) => x.rate),
            },
            computedAt: snapshot.takenAt,
            validUntil: expires,
            source: { table: 'players', ids: group.map((x) => x.player.id) },
            interest: 0,
        });
    }

    return facts;
}

export interface AwardValue {
    /** candidates, best first */
    playerIds: string[];
    /** wins inside the snapshot window, in the same order */
    recentWins: number[];
}

export interface ContrastValue {
    /** the player on the hottest streak */
    formId: string;
    streak: number;
    /** the player with the best record */
    recordId: string;
    winRate: number;
}

const endOfWeek = (from: string): string => {
    const d = new Date(from);
    d.setUTCDate(d.getUTCDate() + (7 - ((d.getUTCDay() + 6) % 7)));
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
};

/**
 * A vote for the standout of the period. No right answer, so it always pays and
 * never touches the combo — and it never goes stale in the way a prediction can,
 * which is what makes it the shock absorber for a thin week (content spec §3.1).
 */
export function awardFacts(snapshot: Snapshot, { size = 4 } = {}): Fact<AwardValue>[] {
    // Wins per player, per tournament — one vote per draw gives the week
    // several different votes instead of the same four names every day.
    const byTournament = new Map<string, Map<string, number>>();

    for (const { match, result } of snapshot.matches) {
        const key = match.tournament_id ?? 'all';
        const side = sideIds(match, 'a').includes(result.winner_id) ? 'a' : 'b';
        for (const id of sideIds(match, side)) {
            if (!isAskable(snapshot.players.get(id),
                match.match_type === 'doubles' ? 'doubles' : 'singles')) continue;
            const wins = byTournament.get(key) ?? new Map<string, number>();
            wins.set(id, (wins.get(id) ?? 0) + 1);
            byTournament.set(key, wins);
        }
    }

    const facts: Fact<AwardValue>[] = [];
    for (const [key, wins] of byTournament) {
        const top = [...wins.entries()].sort((x, y) => y[1] - x[1]).slice(0, size);
        // Four candidates or it is not a vote.
        if (top.length < size) continue;

        facts.push({
            id: `award:${key}`,
            kind: 'award',
            subjects: top.map(([id]) => id),
            value: { playerIds: top.map(([id]) => id), recentWins: top.map(([, n]) => n) },
            computedAt: snapshot.takenAt,
            validUntil: endOfWeek(snapshot.takenAt),
            source: { table: 'match_results', ids: top.map(([id]) => id) },
            interest: 0,
        });
    }
    return facts;
}

/**
 * Two players worth arguing about: the one in form against the one with the
 * record. Taste, not knowledge — there is nothing to get wrong.
 */
export function contrastFacts(
    snapshot: Snapshot, { pairs = 6 } = {},
): Fact<ContrastValue>[] {
    const askable = [...snapshot.players.values()].filter((p) => isAskable(p, 'singles'));
    if (askable.length < 2) return [];

    // A streak of one is not a story.
    const inForm = [...askable]
        .filter((p) => (p.current_streak ?? 0) >= 2)
        .sort((x, y) => (y.current_streak ?? 0) - (x.current_streak ?? 0));
    const onRecord = [...askable]
        .sort((x, y) => (winRate(y) ?? 0) - (winRate(x) ?? 0));

    const facts: Fact<ContrastValue>[] = [];
    const used = new Set<string>();

    // Pair the hottest against the best, then the next of each, and so on —
    // several arguments rather than one, so the week has more than a single
    // matter of taste in it.
    for (let k = 0; k < pairs; k++) {
        const form = inForm[k];
        const record = onRecord.find((p) => p.id !== form?.id && !used.has(p.id));
        if (!form || !record) break;
        used.add(form.id);
        used.add(record.id);

        facts.push({
            id: `contrast:${form.id}+${record.id}`,
            kind: 'contrast',
            subjects: [form.id, record.id],
            value: {
                formId: form.id, streak: form.current_streak ?? 0,
                recordId: record.id,
                winRate: Math.round((winRate(record) ?? 0) * 100),
            },
            computedAt: snapshot.takenAt,
            validUntil: endOfWeek(snapshot.takenAt),
            source: { table: 'players', ids: [form.id, record.id] },
            interest: 0,
        });
    }
    return facts;
}

export function allFacts(snapshot: Snapshot): Fact[] {
    return [
        ...resultFacts(snapshot),
        ...setScoreFacts(snapshot),
        ...upsetFacts(snapshot),
        ...rankingFacts(snapshot),
        ...awardFacts(snapshot),
        ...contrastFacts(snapshot),
    ];
}
