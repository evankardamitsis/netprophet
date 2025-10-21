-- Restore missing profile columns that were accidentally removed during cleanup
-- This migration restores essential columns for the application to function

-- Restore tournament_pass_used column
ALTER TABLE public.profiles ADD COLUMN
IF NOT EXISTS tournament_pass_used BOOLEAN DEFAULT false;

-- Restore leaderboard columns
ALTER TABLE public.profiles ADD COLUMN
IF NOT EXISTS leaderboard_points INTEGER DEFAULT 0;

ALTER TABLE public.profiles ADD COLUMN
IF NOT EXISTS current_winning_streak INTEGER DEFAULT 0;

ALTER TABLE public.profiles ADD COLUMN
IF NOT EXISTS best_winning_streak INTEGER DEFAULT 0;

ALTER TABLE public.profiles ADD COLUMN
IF NOT EXISTS total_correct_picks INTEGER DEFAULT 0;

ALTER TABLE public.profiles ADD COLUMN
IF NOT EXISTS total_picks INTEGER DEFAULT 0;

ALTER TABLE public.profiles ADD COLUMN
IF NOT EXISTS accuracy_percentage DECIMAL(5,2) DEFAULT 0.00;

ALTER TABLE public.profiles ADD COLUMN
IF NOT EXISTS last_leaderboard_update TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Restore wallet columns
ALTER TABLE public.profiles ADD COLUMN
IF NOT EXISTS total_winnings INTEGER DEFAULT 0;

ALTER TABLE public.profiles ADD COLUMN
IF NOT EXISTS total_losses INTEGER DEFAULT 0;

ALTER TABLE public.profiles ADD COLUMN
IF NOT EXISTS won_bets INTEGER DEFAULT 0;

ALTER TABLE public.profiles ADD COLUMN
IF NOT EXISTS lost_bets INTEGER DEFAULT 0;

ALTER TABLE public.profiles ADD COLUMN
IF NOT EXISTS total_bets INTEGER DEFAULT 0;

ALTER TABLE public.profiles ADD COLUMN
IF NOT EXISTS referral_bonus_earned INTEGER DEFAULT 0;

ALTER TABLE public.profiles ADD COLUMN
IF NOT EXISTS leaderboard_prizes_earned INTEGER DEFAULT 0;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_leaderboard_points ON profiles(leaderboard_points DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_current_streak ON profiles(current_winning_streak DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_best_streak ON profiles(best_winning_streak DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_accuracy ON profiles(accuracy_percentage DESC);
