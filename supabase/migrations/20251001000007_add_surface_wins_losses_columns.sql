-- Add surface-specific wins, losses, and win rate columns to players table
-- These columns track performance on each surface type

-- Add wins/losses columns for each surface
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS hard_wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS hard_losses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS hard_win_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS clay_wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clay_losses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clay_win_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS grass_wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS grass_losses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS grass_win_rate DECIMAL(5,2) DEFAULT 0;

-- Add overall win_rate column
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS win_rate DECIMAL(5,2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.players.hard_wins IS 'Total wins on hard court';
COMMENT ON COLUMN public.players.hard_losses IS 'Total losses on hard court';
COMMENT ON COLUMN public.players.hard_win_rate IS 'Win rate percentage on hard court (0-100)';
COMMENT ON COLUMN public.players.clay_wins IS 'Total wins on clay court';
COMMENT ON COLUMN public.players.clay_losses IS 'Total losses on clay court';
COMMENT ON COLUMN public.players.clay_win_rate IS 'Win rate percentage on clay court (0-100)';
COMMENT ON COLUMN public.players.grass_wins IS 'Total wins on grass court';
COMMENT ON COLUMN public.players.grass_losses IS 'Total losses on grass court';
COMMENT ON COLUMN public.players.grass_win_rate IS 'Win rate percentage on grass court (0-100)';
COMMENT ON COLUMN public.players.win_rate IS 'Overall win rate percentage (0-100)';

-- Calculate win rates for existing players based on their match data
-- Only for players with match data (wins/losses or surface matches)
UPDATE public.players
SET
    -- Calculate surface wins/losses from total and match counts (estimate)
    hard_wins = CASE 
        WHEN hard_matches > 0 THEN ROUND((wins::DECIMAL / (wins + losses)) * hard_matches)
        ELSE 0
    END,
    hard_losses = CASE 
        WHEN hard_matches > 0 THEN hard_matches - ROUND((wins::DECIMAL / (wins + losses)) * hard_matches)
        ELSE 0
    END,
    clay_wins = CASE 
        WHEN clay_matches > 0 THEN ROUND((wins::DECIMAL / (wins + losses)) * clay_matches)
        ELSE 0
    END,
    clay_losses = CASE 
        WHEN clay_matches > 0 THEN clay_matches - ROUND((wins::DECIMAL / (wins + losses)) * clay_matches)
        ELSE 0
    END,
    grass_wins = CASE 
        WHEN grass_matches > 0 THEN ROUND((wins::DECIMAL / (wins + losses)) * grass_matches)
        ELSE 0
    END,
    grass_losses = CASE 
        WHEN grass_matches > 0 THEN grass_matches - ROUND((wins::DECIMAL / (wins + losses)) * grass_matches)
        ELSE 0
    END,
    -- Calculate win rates
    hard_win_rate = CASE 
        WHEN hard_matches > 0 THEN ROUND((wins::DECIMAL / (wins + losses)) * 100, 2)
        ELSE 0
    END,
    clay_win_rate = CASE 
        WHEN clay_matches > 0 THEN ROUND((wins::DECIMAL / (wins + losses)) * 100, 2)
        ELSE 0
    END,
    grass_win_rate = CASE 
        WHEN grass_matches > 0 THEN ROUND((wins::DECIMAL / (wins + losses)) * 100, 2)
        ELSE 0
    END,
    win_rate = CASE 
        WHEN (wins + losses) > 0 THEN ROUND((wins::DECIMAL / (wins + losses)) * 100, 2)
        ELSE 0
    END
WHERE (wins + losses) > 0;

