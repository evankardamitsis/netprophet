-- Fix economy metrics functions

-- Drop existing functions
DROP FUNCTION IF EXISTS get_total_coins_injected(TEXT);
DROP FUNCTION IF EXISTS get_total_coins_burned(TEXT);
DROP FUNCTION IF EXISTS get_paying_users_count(TEXT);
DROP FUNCTION IF EXISTS get_average_coins_per_user(TEXT);
DROP FUNCTION IF EXISTS get_coin_flow_data(TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_inflow_breakdown(TEXT);
DROP FUNCTION IF EXISTS get_outflow_breakdown(TEXT);
DROP FUNCTION IF EXISTS get_top_users_by_spend(INTEGER);
DROP FUNCTION IF EXISTS get_conversion_rate_trend(INTEGER);
DROP FUNCTION IF EXISTS get_burn_ratio_trend(INTEGER);

-- Function to get total coins injected (positive transactions)
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
            WHEN pp.total = 0 THEN 
                CASE WHEN cp.total > 0 THEN 100.0 ELSE 0.0 END
            ELSE 
                ((cp.total - pp.total) / pp.total::NUMERIC) * 100
        END
    FROM current_period cp, previous_period pp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total coins burned (negative transactions)
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
            WHEN pp.total = 0 THEN 
                CASE WHEN cp.total > 0 THEN 100.0 ELSE 0.0 END
            ELSE 
                ((cp.total - pp.total) / pp.total::NUMERIC) * 100
        END
    FROM current_period cp, previous_period pp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get paying users count
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
        WHERE amount > 0 
        AND created_at >= current_period_start 
        AND created_at <= current_period_end
    ),
    previous_period AS (
        SELECT COUNT(DISTINCT user_id) as count
        FROM transactions
        WHERE amount > 0 
        AND created_at >= previous_period_start 
        AND created_at < previous_period_end
    )
    SELECT 
        cp.count::BIGINT,
        pp.count::BIGINT,
        CASE 
            WHEN pp.count = 0 THEN 
                CASE WHEN cp.count > 0 THEN 100.0 ELSE 0.0 END
            ELSE 
                ((cp.count - pp.count) / pp.count::NUMERIC) * 100
        END
    FROM current_period cp, previous_period pp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get average coins per user
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
            WHEN pp.avg_balance = 0 THEN 
                CASE WHEN cp.avg_balance > 0 THEN 100.0 ELSE 0.0 END
            ELSE 
                ((cp.avg_balance - pp.avg_balance) / pp.avg_balance) * 100
        END
    FROM current_period cp, previous_period pp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get coin flow data over time
CREATE OR REPLACE FUNCTION get_coin_flow_data(time_period TEXT DEFAULT 'month', days_back INTEGER DEFAULT 30)
RETURNS TABLE(
    date DATE,
    inflow BIGINT,
    outflow BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.date::DATE,
        COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0)::BIGINT as inflow,
        COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0)::BIGINT as outflow
    FROM generate_series(
        DATE_TRUNC('day', NOW() - (days_back || ' days')::INTERVAL),
        DATE_TRUNC('day', NOW()),
        '1 day'::INTERVAL
    ) as d(date)
    LEFT JOIN transactions t ON DATE_TRUNC('day', t.created_at) = d.date
    GROUP BY d.date
    ORDER BY d.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get inflow breakdown by type
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

-- Function to get outflow breakdown by type
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

-- Function to get top users by coin spend
CREATE OR REPLACE FUNCTION get_top_users_by_spend(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
    user_id UUID,
    username TEXT,
    email TEXT,
    total_spent BIGINT,
    last_top_up TIMESTAMPTZ,
    bets_placed BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.email,
        COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0)::BIGINT as total_spent,
        MAX(CASE WHEN t.amount > 0 THEN t.created_at END) as last_top_up,
        COUNT(CASE WHEN t.type = 'bet' THEN 1 END)::BIGINT as bets_placed
    FROM profiles p
    LEFT JOIN transactions t ON p.id = t.user_id
    WHERE p.username IS NOT NULL
    GROUP BY p.id, p.username, p.email
    HAVING COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) > 0
    ORDER BY total_spent DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversion rate trend
CREATE OR REPLACE FUNCTION get_conversion_rate_trend(months_back INTEGER DEFAULT 4)
RETURNS TABLE(
    month TEXT,
    conversion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(month_series, 'Mon') as month,
        CASE 
            WHEN total_users = 0 THEN 0
            ELSE (paying_users::NUMERIC / total_users::NUMERIC) * 100
        END as conversion_rate
    FROM (
        SELECT 
            month_series,
            COUNT(DISTINCT p.id) as total_users,
            COUNT(DISTINCT CASE WHEN EXISTS (
                SELECT 1 FROM transactions t 
                WHERE t.user_id = p.id 
                AND t.amount > 0 
                AND DATE_TRUNC('month', t.created_at) = month_series
            ) THEN p.id END) as paying_users
        FROM (
            SELECT DATE_TRUNC('month', NOW() - (generate_series(0, months_back-1) || ' months')::INTERVAL) as month_series
        ) as months
        LEFT JOIN profiles p ON DATE_TRUNC('month', p.created_at) <= month_series
        GROUP BY month_series
    ) as monthly_stats
    ORDER BY month_series;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get burn ratio trend
CREATE OR REPLACE FUNCTION get_burn_ratio_trend(months_back INTEGER DEFAULT 4)
RETURNS TABLE(
    month TEXT,
    burn_ratio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(month_series, 'Mon') as month,
        CASE 
            WHEN total_injected = 0 THEN 0
            ELSE (total_burned::NUMERIC / total_injected::NUMERIC) * 100
        END as burn_ratio
    FROM (
        SELECT 
            month_series,
            COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_injected,
            COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_burned
        FROM (
            SELECT DATE_TRUNC('month', NOW() - (generate_series(0, months_back-1) || ' months')::INTERVAL) as month_series
        ) as months
        LEFT JOIN transactions t ON DATE_TRUNC('month', t.created_at) = month_series
        GROUP BY month_series
    ) as monthly_stats
    ORDER BY month_series;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
