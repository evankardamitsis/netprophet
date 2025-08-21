export interface Match {
    id: string;
    player_a: {
        id: string;
        first_name: string;
        last_name: string;
    };
    player_b: {
        id: string;
        first_name: string;
        last_name: string;
    };
    tournaments: {
        name: string;
        matches_type: string;
    } | null;
    status: string;
    start_time: string | null;
    web_synced: boolean | null;
}

export type FilterStatus = 'all' | 'finished' | 'live' | 'upcoming';

export interface FormData {
    winner_id: string;
    match_result: string;
    set1_score: string;
    set2_score: string;
    set3_score: string;
    set4_score: string;
    set5_score: string;
    set1_winner_id: string;
    set2_winner_id: string;
    set3_winner_id: string;
    set4_winner_id: string;
    set5_winner_id: string;
    set1_tiebreak_score: string;
    set2_tiebreak_score: string;
    set3_tiebreak_score: string;
    set4_tiebreak_score: string;
    set5_tiebreak_score: string;
    super_tiebreak_score: string;
    super_tiebreak_winner_id: string;
    [key: string]: string; // Allow dynamic property access
}
