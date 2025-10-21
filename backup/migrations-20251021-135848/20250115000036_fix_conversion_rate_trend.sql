-- Fix conversion rate trend function to match updated paying users definition
DROP FUNCTION IF EXISTS get_conversion_rate_trend(INTEGER);
CREATE OR REPLACE FUNCTION get_conversion_rate_trend(months_back INTEGER DEFAULT 4)
RETURNS TABLE(
    month TEXT,
    conversion_rate NUMERIC
) AS $$
DECLARE
    month_date DATE;
BEGIN
    -- Create a temporary table to store the series
    CREATE TEMP TABLE month_series AS
    SELECT DATE_TRUNC('month', NOW() - (generate_series(0, months_back-1) || ' months')::INTERVAL) as month_date;
    
    RETURN QUERY
    SELECT 
        TO_CHAR(ms.month_date, 'Mon') as month,
        CASE 
            WHEN total_users = 0 THEN 0
            ELSE (paying_users::NUMERIC / total_users::NUMERIC) * 100
        END as conversion_rate
    FROM month_series ms
    LEFT JOIN (
        SELECT 
            DATE_TRUNC('month', p.created_at) as user_month,
            COUNT(DISTINCT p.id) as total_users
        FROM profiles p
        GROUP BY DATE_TRUNC('month', p.created_at)
    ) users ON users.user_month <= ms.month_date
    LEFT JOIN (
        SELECT 
            DATE_TRUNC('month', t.created_at) as purchase_month,
            COUNT(DISTINCT t.user_id) as paying_users
        FROM transactions t
        WHERE t.type = 'purchase'
        GROUP BY DATE_TRUNC('month', t.created_at)
    ) purchases ON purchases.purchase_month = ms.month_date
    ORDER BY ms.month_date;
    
    -- Clean up
    DROP TABLE month_series;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
