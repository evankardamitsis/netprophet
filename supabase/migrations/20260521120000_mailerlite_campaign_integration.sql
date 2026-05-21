-- MailerLite campaign integration: extended queue, triggers, and helpers
-- Group IDs are resolved in Edge Functions from env vars (GROUP_*)

-- 1. Extend mailerlite_logs queue
ALTER TABLE public.mailerlite_logs
  ADD COLUMN IF NOT EXISTS action TEXT NOT NULL DEFAULT 'upsert',
  ADD COLUMN IF NOT EXISTS fields JSONB,
  ADD COLUMN IF NOT EXISTS group_id TEXT,
  ADD COLUMN IF NOT EXISTS group_keys TEXT[],
  ADD COLUMN IF NOT EXISTS bulk_emails TEXT[],
  ADD COLUMN IF NOT EXISTS execute_after TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS remove_after TIMESTAMPTZ;

-- Allow multiple pending jobs per email (different actions)
DROP INDEX IF EXISTS idx_mailerlite_logs_email_unique;
DROP INDEX IF EXISTS idx_mailerlite_logs_email_action_pending;
CREATE UNIQUE INDEX idx_mailerlite_logs_email_action_pending
  ON public.mailerlite_logs (email, action)
  WHERE status = 'pending' AND email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mailerlite_logs_execute_after
  ON public.mailerlite_logs (execute_after)
  WHERE status = 'pending' AND execute_after IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mailerlite_logs_remove_after
  ON public.mailerlite_logs (remove_after)
  WHERE status = 'pending' AND remove_after IS NOT NULL;

-- 2. Generic queue function
CREATE OR REPLACE FUNCTION public.queue_mailerlite_action(
  p_action TEXT,
  p_email TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_fields JSONB DEFAULT NULL,
  p_groups TEXT[] DEFAULT NULL,
  p_group_keys TEXT[] DEFAULT NULL,
  p_group_id TEXT DEFAULT NULL,
  p_bulk_emails TEXT[] DEFAULT NULL,
  p_execute_after TIMESTAMPTZ DEFAULT NULL,
  p_remove_after TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_email IS NOT NULL THEN
    DELETE FROM public.mailerlite_logs
    WHERE email = p_email
      AND action = COALESCE(p_action, 'upsert')
      AND status = 'pending';
  END IF;

  INSERT INTO public.mailerlite_logs (
    user_id, email, name, status, action, fields,
    groups, group_keys, group_id, bulk_emails,
    execute_after, remove_after, created_at, updated_at
  )
  VALUES (
    p_user_id,
    p_email,
    p_name,
    'pending',
    COALESCE(p_action, 'upsert'),
    p_fields,
    CASE WHEN array_length(p_groups, 1) > 0 THEN p_groups ELSE NULL END,
    CASE WHEN array_length(p_group_keys, 1) > 0 THEN p_group_keys ELSE NULL END,
    p_group_id,
    CASE WHEN array_length(p_bulk_emails, 1) > 0 THEN p_bulk_emails ELSE NULL END,
    p_execute_after,
    p_remove_after,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG '[queue_mailerlite_action] % for %: %', p_action, COALESCE(p_email, 'bulk'), SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.queue_mailerlite_action(TEXT, TEXT, UUID, TEXT, JSONB, TEXT[], TEXT[], TEXT, TEXT[], TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

-- 3. Replace add_user_to_mailerlite to use welcome group key + starting fields
CREATE OR REPLACE FUNCTION public.add_user_to_mailerlite(
    p_user_id UUID,
    p_email TEXT,
    p_name TEXT DEFAULT NULL,
    p_groups TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS void AS $$
BEGIN
    PERFORM public.queue_mailerlite_action(
        'upsert',
        p_email,
        p_user_id,
        p_name,
        jsonb_build_object(
            'coin_balance', 100,
            'last_login_date', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD')
        ),
        p_groups,
        ARRAY['NEW_USERS']::TEXT[]
    );
    RAISE LOG '[add_user_to_mailerlite] Queued welcome upsert for %', p_email;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG '[add_user_to_mailerlite] Error queuing %: %', p_email, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Login sync (callable by authenticated user for own profile)
CREATE OR REPLACE FUNCTION public.queue_mailerlite_login_sync()
RETURNS void AS $$
DECLARE
    v_email TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN;
    END IF;

    SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
    IF v_email IS NULL OR v_email = '' THEN
        RETURN;
    END IF;

    PERFORM public.queue_mailerlite_action(
        'update_fields',
        v_email,
        auth.uid(),
        NULL,
        jsonb_build_object(
            'last_login_date', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD')
        )
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG '[queue_mailerlite_login_sync] %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.queue_mailerlite_login_sync() TO authenticated;

-- 5. Prediction placed
CREATE OR REPLACE FUNCTION public.sync_mailerlite_on_bet_placed()
RETURNS TRIGGER AS $$
DECLARE
    v_email TEXT;
    v_bet_count INTEGER;
BEGIN
    SELECT p.email INTO v_email
    FROM public.profiles p
    WHERE p.id = NEW.user_id;

    SELECT COUNT(*)::INTEGER INTO v_bet_count
    FROM public.bets b
    WHERE b.user_id = NEW.user_id;

    IF v_email IS NULL THEN
        RETURN NEW;
    END IF;

    PERFORM public.queue_mailerlite_action(
        'update_fields',
        v_email,
        NEW.user_id,
        NULL,
        jsonb_build_object(
            'last_prediction_date', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD')
        )
    );

    -- First prediction: leave zero-predictions group
    IF v_bet_count = 1 THEN
        PERFORM public.queue_mailerlite_action(
            'remove_group',
            v_email,
            NEW.user_id,
            NULL, NULL, NULL,
            ARRAY['ZERO_PREDICTIONS']::TEXT[]
        );
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG '[sync_mailerlite_on_bet_placed] %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_mailerlite_bet_placed ON public.bets;
CREATE TRIGGER trigger_mailerlite_bet_placed
    AFTER INSERT ON public.bets
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_mailerlite_on_bet_placed();

-- 6. Prediction settled — field sync + low-coin nurture (Resend emails unchanged)
CREATE OR REPLACE FUNCTION public.sync_mailerlite_on_bet_settled()
RETURNS TRIGGER AS $$
DECLARE
    v_email TEXT;
    v_balance INTEGER;
    v_rank INTEGER;
    v_accuracy NUMERIC;
    v_streak INTEGER;
    v_coins_won INTEGER;
    v_has_purchased BOOLEAN;
    v_week_start TIMESTAMPTZ;
BEGIN
    IF (NEW.status NOT IN ('won', 'lost'))
       OR (OLD.status IS NOT NULL AND OLD.status = NEW.status) THEN
        RETURN NEW;
    END IF;

    SELECT
        p.email,
        COALESCE(p.balance, 0)::INTEGER,
        COALESCE(p.current_winning_streak, 0)::INTEGER,
        COALESCE(p.accuracy_percentage, 0)::NUMERIC
    INTO v_email, v_balance, v_streak, v_accuracy
    FROM public.profiles p
    WHERE p.id = NEW.user_id;

    IF v_email IS NULL THEN
        RETURN NEW;
    END IF;

    v_week_start := date_trunc('week', NOW());

    SELECT COALESCE(SUM(b.winnings_paid), 0)::INTEGER
    INTO v_coins_won
    FROM public.bets b
    WHERE b.user_id = NEW.user_id
      AND b.status = 'won'
      AND b.resolved_at >= v_week_start;

    SELECT EXISTS (
        SELECT 1 FROM public.transactions t
        WHERE t.user_id = NEW.user_id AND t.type = 'purchase'
        LIMIT 1
    ) INTO v_has_purchased;

    -- Approximate rank from leaderboard points (weekly sync refines this)
    SELECT COUNT(*) + 1 INTO v_rank
    FROM public.profiles p2
    WHERE COALESCE(p2.leaderboard_points, 0) > (
        SELECT COALESCE(leaderboard_points, 0) FROM public.profiles WHERE id = NEW.user_id
    );

    PERFORM public.queue_mailerlite_action(
        'update_fields',
        v_email,
        NEW.user_id,
        NULL,
        jsonb_build_object(
            'coin_balance', v_balance,
            'user_rank', v_rank,
            'user_accuracy', ROUND(v_accuracy),
            'coins_won', v_coins_won,
            'streak', v_streak
        )
    );

    IF v_balance < 50 AND NOT v_has_purchased THEN
        PERFORM public.queue_mailerlite_action(
            'add_group',
            v_email,
            NEW.user_id,
            NULL, NULL, NULL,
            ARRAY['COIN_BUYERS']::TEXT[]
        );
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG '[sync_mailerlite_on_bet_settled] %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_mailerlite_bet_settled ON public.bets;
CREATE TRIGGER trigger_mailerlite_bet_settled
    AFTER UPDATE OF status ON public.bets
    FOR EACH ROW
    WHEN (NEW.status IN ('won', 'lost') AND (OLD.status IS NULL OR OLD.status IS DISTINCT FROM NEW.status))
    EXECUTE FUNCTION public.sync_mailerlite_on_bet_settled();

-- 7. Coin purchase confirmed
CREATE OR REPLACE FUNCTION public.sync_mailerlite_on_coin_purchase()
RETURNS TRIGGER AS $$
DECLARE
    v_email TEXT;
    v_balance INTEGER;
BEGIN
    IF NEW.type <> 'purchase' THEN
        RETURN NEW;
    END IF;

    SELECT p.email, COALESCE(p.balance, 0)::INTEGER
    INTO v_email, v_balance
    FROM public.profiles p
    WHERE p.id = NEW.user_id;

    IF v_email IS NULL THEN
        RETURN NEW;
    END IF;

    PERFORM public.queue_mailerlite_action(
        'update_fields',
        v_email,
        NEW.user_id,
        NULL,
        jsonb_build_object('coin_balance', v_balance)
    );

    PERFORM public.queue_mailerlite_action(
        'remove_group',
        v_email,
        NEW.user_id,
        NULL, NULL, NULL,
        ARRAY['COIN_BUYERS']::TEXT[]
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG '[sync_mailerlite_on_coin_purchase] %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_mailerlite_coin_purchase ON public.transactions;
CREATE TRIGGER trigger_mailerlite_coin_purchase
    AFTER INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_mailerlite_on_coin_purchase();

COMMENT ON FUNCTION public.queue_mailerlite_action IS
'Queues a MailerLite API job. Processed by mailerlite-process-queue Edge Function. Non-blocking.';
