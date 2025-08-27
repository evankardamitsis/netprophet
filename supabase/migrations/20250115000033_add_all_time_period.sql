-- Add support for "all time" period in economy metrics functions

-- Update get_total_coins_injected function
DROP FUNCTION IF EXISTS get_total_coins_injected(TEXT);
CREATE OR REPLACE FUNCTION get_total_coins_injected(time_period TEXT DEFAULT 'month')
RETURNS TABLE(
    total_coins_injected BIGINT,
    previous_period_coins BIGINT,
    percentage_change NUMERIC
) AS $$
DECLARE
    current_period_start TIMESTAMP;
    current_period_end TIMESTAMP;
    previous_period_start TIMESTAMP;
    previous_period_end TIMESTAMP;
BEGIN
    -- Set time periods based on parameter
    CASE time_period
        WHEN 'day' THEN
            current_period_start := DATE_TRUNC('day', NOW());
            current_period_end := NOW();
            previous_period_start := DATE_TRUNC('day', NOW() - INTERVAL '1 day');
            previous_period_end := current_period_start;
        WHEN 'week' THEN
            current_period_start := DATE_TRUNC('week', NOW());
            current_period_end := NOW();
            previous_period_start := DATE_TRUNC('week', NOW() - INTERVAL '1 week');
            previous_period_end := current_period_start;
        WHEN 'month' THEN
            current_period_start := DATE_TRUNC('month', NOW());
            current_period_end := NOW();
            previous_period_start := DATE_TRUNC('month', NOW() - INTERVAL '1 month');
            previous_period_end := current_period_start;
        WHEN 'quarter' THEN
            current_period_start := DATE_TRUNC('quarter', NOW());
            current_period_end := NOW();
            previous_period_start := DATE_TRUNC('quarter', NOW() - INTERVAL '3 months');
            previous_period_end := current_period_start;
        WHEN 'all' THEN
            current_period_start := '1970-01-01'::TIMESTAMP;
            current_period_end := NOW();
            previous_period_start := '1970-01-01'::TIMESTAMP;
            previous_period_end := NOW();
        ELSE
            current_period_start := DATE_TRUNC('month', NOW());
            current_period_end := NOW();
            previous_period_start := DATE_TRUNC('month', NOW() - INTERVAL '1 month');
            previous_period_end := current_period_start;
    END CASE;

    RETURN QUERY
    WITH current_period AS (
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE amount > 0 
        AND created_at >= current_period_start 
        AND created_at <= current_period_end
    ),
    previous_period AS (
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE amount > 0 
        AND created_at >= previous_period_start 
        AND created_at < previous_period_end
    )
    SELECT 
        cp.total::BIGINT,
        pp.total::BIGINT,
        CASE 
            WHEN time_period = 'all' THEN 0
            WHEN pp.total = 0 THEN 
                CASE WHEN cp.total > 0 THEN 100.0 ELSE 0.0 END
            ELSE 
                ((cp.total - pp.total) / pp.total::NUMERIC) * 100
        END
    FROM current_period cp, previous_period pp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_total_coins_burned function
DROP FUNCTION IF EXISTS get_total_coins_burned(TEXT);
CREATE OR REPLACE FUNCTION get_total_coins_burned(time_period TEXT DEFAULT 'month')
RETURNS TABLE(
    total_coins_burned BIGINT,
    previous_period_coins BIGINT,
    percentage_change NUMERIC
) AS $$
DECLARE
    current_period_start TIMESTAMP;
    current_period_end TIMESTAMP;
    previous_period_start TIMESTAMP;
    previous_period_end TIMESTAMP;
BEGIN
    -- Set time periods based on parameter
    CASE time_period
        WHEN 'day' THEN
            current_period_start := DATE_TRUNC('day', NOW());
            current_period_end := NOW();
            previous_period_start := DATE_TRUNC('day', NOW() - INTERVAL '1 day');
            previous_period_end := current_period_start;
        WHEN 'week' THEN
            current_period_start := DATE_TRUNC('week', NOW());
            current_period_end := NOW();
            previous_period_start := DATE_TRUNC('week', NOW() - INTERVAL '1 week');
            previous_period_end := current_period_start;
        WHEN 'month' THEN
            current_period_start := DATE_TRUNC('month', NOW());
            current_period_end := NOW();
            previous_period_start := DATE_TRUNC('month', NOW() - INTERVAL '1 month');
            previous_period_end := current_period_start;
        WHEN 'quarter' THEN
            current_period_start := DATE_TRUNC('quarter', NOW());
            current_period_end := NOW();
            previous_period_start := DATE_TRUNC('quarter', NOW() - INTERVAL '3 months');
            previous_period_end := current_period_start;
        WHEN 'all' THEN
            current_period_start := '1970-01-01'::TIMESTAMP;
            current_period_end := NOW();
            previous_period_start := '1970-01-01'::TIMESTAMP;
            previous_period_end := NOW();
        ELSE
            current_period_start := DATE_TRUNC('month', NOW());
            current_period_end := NOW();
            previous_period_start := DATE_TRUNC('month', NOW() - INTERVAL '1 month');
            previous_period_end := current_period_start;
    END CASE;

    RETURN QUERY
    WITH current_period AS (
        SELECT COALESCE(SUM(ABS(amount)), 0) as total
        FROM transactions
        WHERE amount < 0 
        AND created_at >= current_period_start 
        AND created_at <= current_period_end
    ),
    previous_period AS (
        SELECT COALESCE(SUM(ABS(amount)), 0) as total
        FROM transactions
        WHERE amount < 0 
        AND created_at >= previous_period_start 
        AND created_at < previous_period_end
    )
    SELECT 
        cp.total::BIGINT,
        pp.total::BIGINT,
        CASE 
            WHEN time_period = 'all' THEN 0
            WHEN pp.total = 0 THEN 
                CASE WHEN cp.total > 0 THEN 100.0 ELSE 0.0 END
            ELSE 
                ((cp.total - pp.total) / pp.total::NUMERIC) * 100
        END
    FROM current_period cp, previous_period pp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_paying_users_count function
DROP FUNCTION IF EXISTS get_paying_users_count(TEXT);
CREATE OR REPLACE FUNCTION get_paying_users_count(time_period TEXT DEFAULT 'month')
RETURNS TABLE(
    paying_users_count BIGINT,
    previous_period_count BIGINT,
    percentage_change NUMERIC
) AS $$
DECLARE
    current_period_start TIMESTAMP;
    current_period_end TIMESTAMP;
    previous_period_start TIMESTAMP;
    previous_period_end TIMESTAMP;
BEGIN
    -- Set time periods based on parameter
    CASE time_period
        WHEN 'day' THEN
            current_period_start := DATE_TRUNC('day', NOW());
            current_period_end := NOW();
            previous_period_start := DATE_TRUNC('day', NOW() - INTERVAL '1 day');
            previous_period_end := current_period_start;
        WHEN 'week' THEN
            current_period_start := DATE_TRUNC('week', NOW());
            current_period_end := NOW();
            previous_period_start := DATE_TRUNC('week', NOW() - INTERVAL '1 week');
            previous_period_end := current_period_start;
        WHEN 'month' THEN
            current_period_start := DATE_TRUNC('month', NOW());
            current_period_end := NOW();
            previous_period_start := DATE_TRUNC('month', NOW() - INTERVAL '1 month');
            previous_period_end := current_period_start;
        WHEN 'quarter' THEN
            current_period_start := DATE_TRUNC('quarter', NOW());
            current_period_end := NOW();
            previous_period_start := DATE_TRUNC('quarter', NOW() - INTERVAL '3 months');
            previous_period_end := current_period_start;
        WHEN 'all' THEN
            current_period_start := '1970-01-01'::TIMESTAMP;
            current_period_end := NOW();
            previous_period_start := '1970-01-01'::TIMESTAMP;
            previous_period_end := NOW();
        ELSE
            current_period_start := DATE_TRUNC('month', NOW());
            current_period_end := NOW();
            previous_period_start := DATE_TRUNC('month', NOW() - INTERVAL '1 month');
            previous_period_end := current_period_start;
    END CASE;

    RETURN QUERY
    WITH current_period AS (
        SELECT COUNT(DISTINCT user_id) as count
        FROM transactions
        WHERE type = 'purchase' 
        AND created_at >= current_period_start 
        AND created_at <= current_period_end
    ),
    previous_period AS (
        SELECT COUNT(DISTINCT user_id) as count
        FROM transactions
        WHERE type = 'purchase' 
        AND created_at >= previous_period_start 
        AND created_at < previous_period_end
    )
    SELECT 
        cp.count::BIGINT,
        pp.count::BIGINT,
        CASE 
            WHEN time_period = 'all' THEN 0
            WHEN pp.count = 0 THEN 
                CASE WHEN cp.count > 0 THEN 100.0 ELSE 0.0 END
            ELSE 
                ((cp.count - pp.count) / pp.count::NUMERIC) * 100
        END
    FROM current_period cp, previous_period pp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_average_coins_per_user function
DROP FUNCTION IF EXISTS get_average_coins_per_user(TEXT);
CREATE OR REPLACE FUNCTION get_average_coins_per_user(time_period TEXT DEFAULT 'month')
RETURNS TABLE(
    average_coins_per_user NUMERIC,
    previous_period_average NUMERIC,
    percentage_change NUMERIC
) AS $$
DECLARE
    current_period_start TIMESTAMP;
    current_period_end TIMESTAMP;
    previous_period_start TIMESTAMP;
    previous_period_end TIMESTAMP;
BEGIN
    -- Set time periods based on parameter
    CASE time_period
        WHEN 'day' THEN
            current_period_start := DATE_TRUNC('day', NOW());
            current_period_end := NOW();
            previous_period_start := DATE_TRUNC('day', NOW() - INTERVAL '1 day');
            previous_period_end := current_period_start;
        WHEN 'week' THEN
            current_period_start := DATE_TRUNC('week', NOW());
            current_period_end := NOW();
            previous_period_start := DATE_TRUNC('week', NOW() - INTERVAL '1 week');
            previous_period_end := current_period_start;
        WHEN 'month' THEN
            current_period_start := DATE_TRUNC('month', NOW());
            current_period_end := NOW();
            previous_period_start := DATE_TRUNC('month', NOW() - INTERVAL '1 month');
            previous_period_end := current_period_start;
        WHEN 'quarter' THEN
            current_period_start := DATE_TRUNC('quarter', NOW());
            current_period_end := NOW();
            previous_period_start := DATE_TRUNC('quarter', NOW() - INTERVAL '3 months');
            previous_period_end := current_period_start;
        WHEN 'all' THEN
            current_period_start := '1970-01-01'::TIMESTAMP;
            current_period_end := NOW();
            previous_period_start := '1970-01-01'::TIMESTAMP;
            previous_period_end := NOW();
        ELSE
            current_period_start := DATE_TRUNC('month', NOW());
            current_period_end := NOW();
            previous_period_start := DATE_TRUNC('month', NOW() - INTERVAL '1 month');
            previous_period_end := current_period_start;
    END CASE;

    RETURN QUERY
    WITH current_period AS (
        SELECT AVG(balance) as avg_balance
        FROM profiles
        WHERE created_at >= current_period_start 
        AND created_at <= current_period_end
    ),
    previous_period AS (
        SELECT AVG(balance) as avg_balance
        FROM profiles
        WHERE created_at >= previous_period_start 
        AND created_at < previous_period_end
    )
    SELECT 
        COALESCE(cp.avg_balance, 0),
        COALESCE(pp.avg_balance, 0),
        CASE 
            WHEN time_period = 'all' THEN 0
            WHEN pp.avg_balance = 0 THEN 
                CASE WHEN cp.avg_balance > 0 THEN 100.0 ELSE 0.0 END
            ELSE 
                ((cp.avg_balance - pp.avg_balance) / pp.avg_balance) * 100
        END
    FROM current_period cp, previous_period pp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_inflow_breakdown function
DROP FUNCTION IF EXISTS get_inflow_breakdown(TEXT);
CREATE OR REPLACE FUNCTION get_inflow_breakdown(time_period TEXT DEFAULT 'month')
RETURNS TABLE(
    transaction_type TEXT,
    total_amount BIGINT,
    percentage NUMERIC
) AS $$
DECLARE
    period_start TIMESTAMP;
    period_end TIMESTAMP;
    total_inflow BIGINT;
BEGIN
    -- Set time period
    CASE time_period
        WHEN 'day' THEN
            period_start := DATE_TRUNC('day', NOW());
            period_end := NOW();
        WHEN 'week' THEN
            period_start := DATE_TRUNC('week', NOW());
            period_end := NOW();
        WHEN 'month' THEN
            period_start := DATE_TRUNC('month', NOW());
            period_end := NOW();
        WHEN 'quarter' THEN
            period_start := DATE_TRUNC('quarter', NOW());
            period_end := NOW();
        WHEN 'all' THEN
            period_start := '1970-01-01'::TIMESTAMP;
            period_end := NOW();
        ELSE
            period_start := DATE_TRUNC('month', NOW());
            period_end := NOW();
    END CASE;

    -- Get total inflow
    SELECT COALESCE(SUM(amount), 0) INTO total_inflow
    FROM transactions
    WHERE amount > 0 
    AND created_at >= period_start 
    AND created_at <= period_end;

    RETURN QUERY
    SELECT 
        t.type::TEXT,
        COALESCE(SUM(t.amount), 0)::BIGINT,
        CASE 
            WHEN total_inflow = 0 THEN 0
            ELSE (SUM(t.amount) / total_inflow::NUMERIC) * 100
        END
    FROM transactions t
    WHERE t.amount > 0 
    AND t.created_at >= period_start 
    AND t.created_at <= period_end
    GROUP BY t.type
    ORDER BY SUM(t.amount) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_outflow_breakdown function
DROP FUNCTION IF EXISTS get_outflow_breakdown(TEXT);
CREATE OR REPLACE FUNCTION get_outflow_breakdown(time_period TEXT DEFAULT 'month')
RETURNS TABLE(
    transaction_type TEXT,
    total_amount BIGINT,
    percentage NUMERIC
) AS $$
DECLARE
    period_start TIMESTAMP;
    period_end TIMESTAMP;
    total_outflow BIGINT;
BEGIN
    -- Set time period
    CASE time_period
        WHEN 'day' THEN
            period_start := DATE_TRUNC('day', NOW());
            period_end := NOW();
        WHEN 'week' THEN
            period_start := DATE_TRUNC('week', NOW());
            period_end := NOW();
        WHEN 'month' THEN
            period_start := DATE_TRUNC('month', NOW());
            period_end := NOW();
        WHEN 'quarter' THEN
            period_start := DATE_TRUNC('quarter', NOW());
            period_end := NOW();
        WHEN 'all' THEN
            period_start := '1970-01-01'::TIMESTAMP;
            period_end := NOW();
        ELSE
            period_start := DATE_TRUNC('month', NOW());
            period_end := NOW();
    END CASE;

    -- Get total outflow
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO total_outflow
    FROM transactions
    WHERE amount < 0 
    AND created_at >= period_start 
    AND created_at <= period_end;

    RETURN QUERY
    SELECT 
        t.type::TEXT,
        COALESCE(SUM(ABS(t.amount)), 0)::BIGINT,
        CASE 
            WHEN total_outflow = 0 THEN 0
            ELSE (SUM(ABS(t.amount)) / total_outflow::NUMERIC) * 100
        END
    FROM transactions t
    WHERE t.amount < 0 
    AND t.created_at >= period_start 
    AND t.created_at <= period_end
    GROUP BY t.type
    ORDER BY SUM(ABS(t.amount)) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
