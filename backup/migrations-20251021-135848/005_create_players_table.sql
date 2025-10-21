-- 005_create_players_table.sql
-- Re-create the players table for NetProphet

DROP TABLE IF EXISTS players;

CREATE TABLE players (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name text NOT NULL,
    last_name text NOT NULL,
    ntrp_rating numeric NOT NULL,
    wins integer NOT NULL DEFAULT 0,
    losses integer NOT NULL DEFAULT 0,
    last5 text[] NOT NULL DEFAULT '{}',
    current_streak integer NOT NULL DEFAULT 0,
    streak_type text NOT NULL,
    surface_preference text NOT NULL,
    surface_win_rates jsonb NOT NULL DEFAULT '{}',
    aggressiveness integer NOT NULL DEFAULT 5,
    stamina integer NOT NULL DEFAULT 5,
    consistency integer NOT NULL DEFAULT 5,
    age integer NOT NULL,
    hand text NOT NULL,
    notes text,
    last_match_date date,
    fatigue_level integer,
    injury_status text NOT NULL DEFAULT 'healthy',
    seasonal_form numeric,
    CONSTRAINT streak_type_check CHECK (streak_type IN ('W', 'L')),
    CONSTRAINT surface_preference_check CHECK (surface_preference IN ('Hard Court', 'Clay Court', 'Grass Court', 'Indoor')),
    CONSTRAINT hand_check CHECK (hand IN ('left', 'right'))
); 