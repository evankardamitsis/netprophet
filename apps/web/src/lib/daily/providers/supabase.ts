// lib/daily/providers/supabase.ts
//
// Read-only access to the real scene, for the generator. Never called from a
// render — cards are generated offline, reviewed, and stored; components read
// the stored card, not this.
//
// Deliberately does not import the app's Supabase client from `@netprophet/lib`:
// the zero-coupling rule still holds, and this needs a service-role client with
// a different lifetime anyway. The row shapes below are declared locally for the
// same reason. They are a subset — only what the facts layer reads.
//
// Everything here is SELECT. Nothing in `lib/daily` may write to these tables.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/* ---------- row shapes, narrowed to what facts.ts needs ---------- */

export interface PlayerRow {
    id: string;
    first_name: string;
    last_name: string;
    ntrp_rating: number;
    wins: number;
    losses: number;
    last5: string[] | null;
    current_streak: number;
    streak_type: string;
    /** wins/losses count singles only; doubles has its own mirror */
    doubles_wins: number;
    doubles_losses: number;
    doubles_last5: string[] | null;
    doubles_current_streak: number;
    doubles_streak_type: string;
    clay_win_rate: number | null;
    hard_win_rate: number | null;
    clay_matches: number | null;
    hard_matches: number | null;
    /** continuous, unlike ntrp_rating which is a coarse 3.5 / 4.0 / 4.5 scale */
    win_rate: number | null;
    age: number;
    hand: string;
    is_active: boolean | null;
    is_hidden: boolean | null;
    is_demo_player: boolean | null;
}

export interface MatchRow {
    id: string;
    start_time: string | null;
    status: string;
    round: string | null;
    match_type: 'singles' | 'doubles';
    tournament_id: string | null;
    category_id: string | null;
    /** the model's view of the matchup, not a betting line — see content spec §1.1 */
    odds_a: number | null;
    odds_b: number | null;
    player_a_id: string | null;
    player_b_id: string | null;
    player_a1_id: string | null;
    player_a2_id: string | null;
    player_b1_id: string | null;
    player_b2_id: string | null;
}

export interface ResultRow {
    match_id: string;
    /** populated on every row; `matches.winner_id` is not — content spec §2.2 */
    winner_id: string;
    match_result: string;
    set1_score: string | null;
    set2_score: string | null;
    set3_score: string | null;
    super_tiebreak_score: string | null;
}

export interface TournamentRow {
    id: string;
    name: string;
    location: string | null;
    surface: string | null;
}

/** Everything a generation run reads, fetched once and then treated as frozen. */
export interface Snapshot {
    takenAt: string;
    /** finished matches with a result, newest first */
    matches: { match: MatchRow; result: ResultRow }[];
    players: Map<string, PlayerRow>;
    tournaments: Map<string, TournamentRow>;
}

const PLAYER_COLUMNS =
    'id,first_name,last_name,ntrp_rating,wins,losses,last5,current_streak,streak_type,'
    + 'doubles_wins,doubles_losses,doubles_last5,doubles_current_streak,doubles_streak_type,'
    + 'clay_win_rate,hard_win_rate,clay_matches,hard_matches,win_rate,age,hand,'
    + 'is_active,is_hidden,is_demo_player';

const MATCH_COLUMNS =
    'id,start_time,status,round,match_type,tournament_id,category_id,odds_a,odds_b,'
    + 'player_a_id,player_b_id,player_a1_id,player_a2_id,player_b1_id,player_b2_id';

const RESULT_COLUMNS =
    'match_id,winner_id,match_result,set1_score,set2_score,set3_score,super_tiebreak_score';

export function createDailyClient(): SupabaseClient {
    if (typeof window !== 'undefined') {
        throw new Error('The Supabase provider is server-only — cards are generated offline.');
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    }
    return createClient(url, key, { auth: { persistSession: false } });
}

/** PostgREST caps a response at 1000 rows; page until it stops filling one. */
async function page<T>(
    run: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
    const rows: T[] = [];
    for (let from = 0; ; from += 1000) {
        const { data, error } = await run(from, from + 999);
        if (error) throw new Error(error.message);
        if (!data) return rows;
        rows.push(...data);
        if (data.length < 1000) return rows;
    }
}

export async function fetchSnapshot({
    client = createDailyClient(),
    since,
}: {
    client?: SupabaseClient;
    /** ISO date; only matches finished on or after this are read */
    since: string;
}): Promise<Snapshot> {
    const matches = await page<MatchRow>((from, to) =>
        client.from('matches').select(MATCH_COLUMNS)
            .eq('status', 'finished').gte('start_time', since)
            .order('start_time', { ascending: false }).range(from, to)
            .returns<MatchRow[]>());

    const results = await page<ResultRow>((from, to) =>
        client.from('match_results').select(RESULT_COLUMNS)
            .in('match_id', matches.map((m) => m.id)).range(from, to)
            .returns<ResultRow[]>());

    const byMatch = new Map(results.map((r) => [r.match_id, r]));

    // A match without a result is not a fact about anything yet.
    const paired = matches
        .map((match) => ({ match, result: byMatch.get(match.id) }))
        .filter((p): p is { match: MatchRow; result: ResultRow } => Boolean(p.result));

    const playerIds = new Set<string>();
    for (const { match } of paired) {
        for (const id of sideIds(match, 'a').concat(sideIds(match, 'b'))) playerIds.add(id);
    }

    const players = playerIds.size
        ? await page<PlayerRow>((from, to) =>
            client.from('players').select(PLAYER_COLUMNS)
                .in('id', [...playerIds]).range(from, to)
                .returns<PlayerRow[]>())
        : [];

    const tournamentIds = [...new Set(paired.map((p) => p.match.tournament_id).filter(Boolean))];
    const tournaments = tournamentIds.length
        ? await page<TournamentRow>((from, to) =>
            client.from('tournaments').select('id,name,location,surface')
                .in('id', tournamentIds as string[]).range(from, to)
                .returns<TournamentRow[]>())
        : [];

    return {
        takenAt: new Date().toISOString(),
        matches: paired,
        players: new Map(players.map((p) => [p.id, p])),
        tournaments: new Map(tournaments.map((t) => [t.id, t])),
    };
}

/** The player ids on one side — one for singles, two for doubles. */
export function sideIds(match: MatchRow, side: 'a' | 'b'): string[] {
    if (match.match_type === 'doubles') {
        return [match[`player_${side}1_id`], match[`player_${side}2_id`]]
            .filter((id): id is string => Boolean(id));
    }
    const single = match[`player_${side}_id`];
    return single ? [single] : [];
}
