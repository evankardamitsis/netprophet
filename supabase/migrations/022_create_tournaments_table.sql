-- Create tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'finished', 'cancelled')),
    surface TEXT NOT NULL CHECK (surface IN ('Hard Court', 'Clay Court', 'Grass Court', 'Indoor')),
    location TEXT,
    prize_pool DECIMAL(10,2),
    entry_fee DECIMAL(10,2) DEFAULT 0,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    tournament_type TEXT NOT NULL DEFAULT 'singles' CHECK (tournament_type IN ('singles', 'doubles', 'mixed')),
    format TEXT NOT NULL DEFAULT 'knockout' CHECK (format IN ('knockout', 'round_robin', 'group_stage')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tournament categories table
CREATE TABLE IF NOT EXISTS public.tournament_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    age_min INTEGER,
    age_max INTEGER,
    skill_level_min TEXT,
    skill_level_max TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'mixed')),
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    entry_fee DECIMAL(10,2) DEFAULT 0,
    prize_pool DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tournament participants table
CREATE TABLE IF NOT EXISTS public.tournament_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.tournament_categories(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'withdrawn', 'disqualified')),
    seed_position INTEGER,
    final_position INTEGER,
    points_earned INTEGER DEFAULT 0,
    UNIQUE(tournament_id, player_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_dates ON public.tournaments(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_tournament_categories_tournament_id ON public.tournament_categories(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_id ON public.tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_player_id ON public.tournament_participants(player_id);

-- Enable RLS
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournaments
CREATE POLICY "Everyone can view tournaments" ON public.tournaments
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage tournaments" ON public.tournaments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- RLS Policies for tournament categories
CREATE POLICY "Everyone can view tournament categories" ON public.tournament_categories
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage tournament categories" ON public.tournament_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- RLS Policies for tournament participants
CREATE POLICY "Everyone can view tournament participants" ON public.tournament_participants
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage tournament participants" ON public.tournament_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON public.tournaments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournament_categories_updated_at BEFORE UPDATE ON public.tournament_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournament_participants_updated_at BEFORE UPDATE ON public.tournament_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 