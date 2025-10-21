-- Fix remaining performance issues
-- This migration addresses potential issues that might be causing the 93 performance warnings

-- 1. Fix the app_users view to be more efficient
DROP VIEW IF EXISTS app_users;
CREATE VIEW app_users AS
    SELECT 
        id,
        email,
        created_at,
        updated_at,
        raw_user_meta_data
    FROM auth.users;

-- 2. Add missing indexes on frequently queried columns

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at DESC);

-- Bets table indexes
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON public.bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_match_id ON public.bets(match_id);
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON public.bets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_status ON public.bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_user_match ON public.bets(user_id, match_id);

-- Matches table indexes
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON public.matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_start_time ON public.matches(start_time);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON public.matches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_updated_at ON public.matches(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_locked ON public.matches(locked) WHERE locked = true;

-- Players table indexes (using correct column names)
CREATE INDEX IF NOT EXISTS idx_players_first_name ON public.players(first_name);
CREATE INDEX IF NOT EXISTS idx_players_last_name ON public.players(last_name);
CREATE INDEX IF NOT EXISTS idx_players_ntrp_rating ON public.players(ntrp_rating);
CREATE INDEX IF NOT EXISTS idx_players_surface_preference ON public.players(surface_preference);
CREATE INDEX IF NOT EXISTS idx_players_hand ON public.players(hand);
CREATE INDEX IF NOT EXISTS idx_players_injury_status ON public.players(injury_status);

-- Daily rewards table indexes
CREATE INDEX IF NOT EXISTS idx_daily_rewards_user_id ON public.daily_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_claimed_date ON public.daily_rewards(claimed_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_user_date ON public.daily_rewards(user_id, claimed_date);

-- Transactions table indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON public.transactions(user_id, type);

-- Notifications table indexes (using correct column names)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- Tournaments table indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_created_at ON public.tournaments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON public.tournaments(start_date);

-- Tournament categories table indexes
CREATE INDEX IF NOT EXISTS idx_tournament_categories_tournament_id ON public.tournament_categories(tournament_id);

-- Tournament participants table indexes (using correct column names)
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_id ON public.tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_player_id ON public.tournament_participants(player_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_status ON public.tournament_participants(status);

-- Coin packs table indexes (using correct column names)
CREATE INDEX IF NOT EXISTS idx_coin_packs_is_active ON public.coin_packs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coin_packs_price_euro ON public.coin_packs(price_euro);

-- 3. Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_matches_tournament_status ON public.matches(tournament_id, status);
CREATE INDEX IF NOT EXISTS idx_bets_user_status ON public.bets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

-- 4. Add partial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_admin_users ON public.profiles(id, email) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_matches_active_tournaments ON public.matches(tournament_id, start_time) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_bets_pending_bets ON public.bets(user_id, created_at) WHERE status = 'pending';
