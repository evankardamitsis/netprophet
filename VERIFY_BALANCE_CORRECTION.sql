-- Verify that balances were correctly updated (coins, not euros/cents)
-- Check if there are any rounding issues or incorrect calculations

-- Step 1: Calculate expected winnings per user
SELECT
    b.user_id,
    p.email,
    p.username,
    COUNT(b.id) as bet_count,
    SUM(b.winnings_paid) as expected_total_winnings,
    ARRAY_AGG(b.winnings_paid
ORDER BY b.id
) as individual_winnings
FROM bets b
INNER JOIN profiles p ON b.user_id = p.id
WHERE b.id IN
(
    'd2d4a1a0-53f5-441a-84e2-b166106a297c',
    '93564588-90ef-43cb-8287-44aaf80f7a44',
    '06065200-e051-47bd-803e-751f31a99de3',
    '4927424a-fdff-4091-9150-cb54467ec84f',
    '57d0b788-7d76-4b4f-8cc4-618a750f014c',
    'ea27d445-0b68-497f-8dee-98d9bc08515b',
    '6779d180-4b89-4d8b-9e8e-1ddc266c8dd4'
)
GROUP BY b.user_id, p.email, p.username
ORDER BY expected_total_winnings DESC;

-- Step 2: Check actual balances vs expected
SELECT
    p.id,
    p.email,
    p.username,
    -- Expected: balance before correction + winnings from corrected bets
    p.balance as current_balance,
    -- Calculate what balance should be
    (
        SELECT COALESCE(SUM(b.winnings_paid), 0)
    FROM bets b
    WHERE b.user_id = p.id
        AND b.id IN (
              'd2d4a1a0-53f5-441a-84e2-b166106a297c',
              '93564588-90ef-43cb-8287-44aaf80f7a44',
              '06065200-e051-47bd-803e-751f31a99de3',
              '4927424a-fdff-4091-9150-cb54467ec84f',
              '57d0b788-7d76-4b4f-8cc4-618a750f014c',
              'ea27d445-0b68-497f-8dee-98d9bc08515b',
              '6779d180-4b89-4d8b-9e8e-1ddc266c8dd4'
          )
    ) as winnings_from_corrected_bets,
    p.total_winnings as current_total_winnings,
    -- Check if balance looks correct (should be coins, not divided by 100)
    CASE 
        WHEN p.balance < 1000 AND p.balance > 0 THEN 'Looks like coins (OK)'
        WHEN p.balance >= 1000 THEN 'Could be cents (check!)'
        ELSE 'Zero or negative'
    END as balance_check
FROM profiles p
WHERE p.id IN (
    SELECT DISTINCT user_id
FROM bets
WHERE id IN (
        'd2d4a1a0-53f5-441a-84e2-b166106a297c',
        '93564588-90ef-43cb-8287-44aaf80f7a44',
        '06065200-e051-47bd-803e-751f31a99de3',
        '4927424a-fdff-4091-9150-cb54467ec84f',
        '57d0b788-7d76-4b4f-8cc4-618a750f014c',
        'ea27d445-0b68-497f-8dee-98d9bc08515b',
        '6779d180-4b89-4d8b-9e8e-1ddc266c8dd4'
    )
)
ORDER BY p.email;

-- Step 3: Check individual bet winnings vs potential_winnings
SELECT
    b.id,
    b.user_id,
    p.email,
    b.potential_winnings,
    b.winnings_paid,
    CASE 
        WHEN b.potential_winnings = b.winnings_paid THEN '✓ Match'
        WHEN b.winnings_paid IS NULL THEN '⚠ Not set'
        ELSE '✗ Mismatch'
    END as winnings_check,
    b.status,
    b.updated_at
FROM bets b
    INNER JOIN profiles p ON b.user_id = p.id
WHERE b.id IN (
    'd2d4a1a0-53f5-441a-84e2-b166106a297c',
    '93564588-90ef-43cb-8287-44aaf80f7a44',
    '06065200-e051-47bd-803e-751f31a99de3',
    '4927424a-fdff-4091-9150-cb54467ec84f',
    '57d0b788-7d76-4b4f-8cc4-618a750f014c',
    'ea27d445-0b68-497f-8dee-98d9bc08515b',
    '6779d180-4b89-4d8b-9e8e-1ddc266c8dd4'
)
ORDER BY b.user_id, b.updated_at DESC;

-- Step 4: Verify no division by 100 happened
-- If balances are in coins, they should be reasonable numbers (not huge)
-- If they were incorrectly divided by 100, we'd see very small numbers
SELECT
    p.id,
    p.email,
    p.balance,
    CASE 
        WHEN p.balance BETWEEN 1 AND 10000 THEN '✓ Looks like coins (reasonable)'
        WHEN p.balance > 10000 THEN '⚠ Could be cents (very high)'
        WHEN p.balance < 1 AND p.balance > 0 THEN '✗ Could be incorrectly divided (too small)'
        ELSE 'Zero'
    END as balance_validation
FROM profiles p
WHERE p.id IN (
    SELECT DISTINCT user_id
FROM bets
WHERE id IN (
        'd2d4a1a0-53f5-441a-84e2-b166106a297c',
        '93564588-90ef-43cb-8287-44aaf80f7a44',
        '06065200-e051-47bd-803e-751f31a99de3',
        '4927424a-fdff-4091-9150-cb54467ec84f',
        '57d0b788-7d76-4b4f-8cc4-618a750f014c',
        'ea27d445-0b68-497f-8dee-98d9bc08515b',
        '6779d180-4b89-4d8b-9e8e-1ddc266c8dd4'
    )
);
