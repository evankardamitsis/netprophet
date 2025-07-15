-- Enable UUID extension
CREATE EXTENSION
IF NOT EXISTS "uuid-ossp";

-- Create clubs table
CREATE TABLE clubs
(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    created_at TIMESTAMP
    WITH TIME ZONE DEFAULT NOW
    ()
);

    -- Create players table
    CREATE TABLE players
    (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        club_id UUID REFERENCES clubs(id),
        elo NUMERIC DEFAULT 1500,
        created_at TIMESTAMP
        WITH TIME ZONE DEFAULT NOW
        ()
);

        -- Create matches table
        CREATE TABLE matches
        (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            player_a UUID NOT NULL REFERENCES players(id),
            player_b UUID NOT NULL REFERENCES players(id),
            a_score INTEGER,
            b_score INTEGER,
            played_at TIMESTAMP
            WITH TIME ZONE NOT NULL,
  prob_a NUMERIC,
  prob_b NUMERIC,
  points_fav INTEGER,
  points_dog INTEGER,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP
            WITH TIME ZONE DEFAULT NOW
            ()
);

            -- Create predictions table
            CREATE TABLE predictions
            (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                match_id UUID NOT NULL REFERENCES matches(id),
                user_id UUID NOT NULL REFERENCES auth.users(id),
                pick VARCHAR(8) NOT NULL CHECK (pick IN ('player_a', 'player_b')),
                stake_points INTEGER DEFAULT 0,
                submitted_at TIMESTAMP
                WITH TIME ZONE DEFAULT NOW
                ()
);

                -- Create app_users view
                CREATE VIEW app_users
                AS
                    SELECT
                        id,
                        raw_user_meta_data->>'username' as username,
                        raw_user_meta_data->>'avatar_url' as avatar_url,
                        created_at
                    FROM auth.users;

                -- Enable Row Level Security
                ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
                ALTER TABLE players ENABLE ROW LEVEL SECURITY;
                ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
                ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

                -- RLS Policies for clubs (read-only for all authenticated users)
                CREATE POLICY "Clubs are viewable by authenticated users" ON clubs
  FOR
                SELECT USING (auth.role() = 'authenticated');

                -- RLS Policies for players (read-only for all authenticated users)
                CREATE POLICY "Players are viewable by authenticated users" ON players
  FOR
                SELECT USING (auth.role() = 'authenticated');

                -- RLS Policies for matches (read-only for all authenticated users)
                CREATE POLICY "Matches are viewable by authenticated users" ON matches
  FOR
                SELECT USING (auth.role() = 'authenticated');

                -- RLS Policies for predictions
                CREATE POLICY "Users can view their own predictions" ON predictions
  FOR
                SELECT USING (auth.uid() = user_id);

                CREATE POLICY "Users can insert predictions until 5 minutes before match" ON predictions
  FOR
                INSERT WITH CHECK (
    auth.uid() =
                user_id
                AND
                EXISTS
                (
      SELECT 1
                FROM matches
                WHERE matches.id = predictions.match_id
                    AND matches.played_at > NOW() + INTERVAL
                '5 minutes'
    )
  );

                CREATE POLICY "Users can update their own predictions until 5 minutes before match" ON predictions
  FOR
                UPDATE USING (
    auth.uid()
                = user_id AND
    EXISTS
                (
      SELECT 1
                FROM matches
                WHERE matches.id = predictions.match_id
                    AND matches.played_at > NOW() + INTERVAL
                '5 minutes'
    )
  );

                -- Create indexes for better performance
                CREATE INDEX idx_players_club_id ON players(club_id);
                CREATE INDEX idx_matches_played_at ON matches(played_at);
                CREATE INDEX idx_matches_processed ON matches(processed);
                CREATE INDEX idx_predictions_user_id ON predictions(user_id);
                CREATE INDEX idx_predictions_match_id ON predictions(match_id);
                CREATE INDEX idx_predictions_submitted_at ON predictions(submitted_at); 