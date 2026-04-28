-- Prevent duplicate active single bets for the same user and match.
-- Excludes parlay rows, where multiple bet rows are expected by design.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bets_unique_active_single_bet_per_match
ON public.bets (user_id, match_id)
WHERE status = 'active'
  AND (is_parlay IS NULL OR is_parlay = false);
