-- 1) Inspect duplicate active single bets (same user_id + match_id)
WITH ranked_active_single_bets AS (
  SELECT
    b.id,
    b.user_id,
    b.match_id,
    b.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY b.user_id, b.match_id
      ORDER BY b.created_at ASC, b.id ASC
    ) AS rn,
    COUNT(*) OVER (
      PARTITION BY b.user_id, b.match_id
    ) AS dup_count
  FROM public.bets b
  WHERE b.status = 'active'
    AND (b.is_parlay IS NULL OR b.is_parlay = false)
)
SELECT
  r.user_id,
  p.username,
  p.email,
  r.match_id,
  r.id AS bet_id,
  r.created_at,
  r.rn,
  r.dup_count
FROM ranked_active_single_bets r
LEFT JOIN public.profiles p ON p.id = r.user_id
WHERE r.dup_count > 1
ORDER BY r.user_id, r.match_id, r.created_at;

-- 2) Cancel duplicates, keeping the earliest active single bet per user+match.
-- Uncomment and run this block ONLY after reviewing the SELECT output above.
/*
WITH ranked_active_single_bets AS (
  SELECT
    b.id,
    ROW_NUMBER() OVER (
      PARTITION BY b.user_id, b.match_id
      ORDER BY b.created_at ASC, b.id ASC
    ) AS rn
  FROM public.bets b
  WHERE b.status = 'active'
    AND (b.is_parlay IS NULL OR b.is_parlay = false)
),
to_cancel AS (
  SELECT id
  FROM ranked_active_single_bets
  WHERE rn > 1
)
UPDATE public.bets b
SET status = 'cancelled',
    updated_at = NOW()
FROM to_cancel c
WHERE b.id = c.id
RETURNING b.id, b.user_id, b.match_id, b.created_at, b.updated_at, b.status;
*/
