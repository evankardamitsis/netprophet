-- Create teams table for team tournaments
-- Teams are groups of players that compete together in team tournaments

CREATE TABLE IF NOT EXISTS public.tournament_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    captain_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_team_name_per_tournament UNIQUE (tournament_id, name)
);

-- Create team_members table to track which players belong to which teams
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_player_per_team UNIQUE (team_id, player_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament_id ON public.tournament_teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_captain_id ON public.tournament_teams(captain_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_player_id ON public.team_members(player_id);

-- Enable RLS
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournament_teams
-- Admins can do everything
CREATE POLICY "Admins can manage tournament teams" ON public.tournament_teams
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Authenticated users can view teams
CREATE POLICY "Authenticated users can view tournament teams" ON public.tournament_teams
    FOR SELECT TO authenticated
    USING (true);

-- RLS Policies for team_members
-- Admins can do everything
CREATE POLICY "Admins can manage team members" ON public.team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Authenticated users can view team members
CREATE POLICY "Authenticated users can view team members" ON public.team_members
    FOR SELECT TO authenticated
    USING (true);

-- Add comments
COMMENT ON TABLE public.tournament_teams IS 'Teams participating in team tournaments';
COMMENT ON TABLE public.team_members IS 'Players that belong to tournament teams';
COMMENT ON COLUMN public.tournament_teams.captain_id IS 'The team captain (one of the team members)';
