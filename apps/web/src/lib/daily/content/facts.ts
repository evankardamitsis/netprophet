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
    | 'ranking';      // order these players by rating

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

export type Discipline = 'singles' | 'doubles';

/** Matches played in the discipline being asked about. */
export function played(player: PlayerRow, discipline: Discipline): number {
    return discipline === 'doubles'
        ? (player.doubles_wins ?? 0) + (player.doubles_losses ?? 0)
        : (player.wins ?? 0) + (player.losses ?? 0);
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
    }: { size?: number; validForDays?: number; minGap?: number } = {},
): Fact<RankingValue>[] {
    const rateOf = (p: PlayerRow): number | null => {
        if (p.win_rate != null) return p.win_rate > 1 ? p.win_rate / 100 : p.win_rate;
        const played = (p.wins ?? 0) + (p.losses ?? 0);
        return played > 0 ? (p.wins ?? 0) / played : null;
    };

    const askable = [...snapshot.players.values()]
        // Ordered by the singles win rate, so it needs a singles record.
        .filter((p) => isAskable(p, 'singles'))
        .map((p) => ({ player: p, rate: rateOf(p) }))
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

export function allFacts(snapshot: Snapshot): Fact[] {
    return [
        ...resultFacts(snapshot),
        ...setScoreFacts(snapshot),
        ...upsetFacts(snapshot),
        ...rankingFacts(snapshot),
    ];
}
