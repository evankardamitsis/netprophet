# Test Prediction Email Function

## Check Why Function Returns Early

The function executed without errors but no emails were created. This means the function is returning early. Let's check each early return condition:

### Step 1: Check If Match Results Exist for Resolved Bets

```sql
-- Check if match results exist for the resolved bets
SELECT 
    b.id as bet_id,
    b.match_id,
    b.status,
    b.resolved_at,
    mr.id as match_result_id,
    mr.match_result,
    mr.winner_id,
    CASE 
        WHEN mr.id IS NULL THEN 'NO MATCH RESULT - FUNCTION WILL RETURN EARLY'
        ELSE 'MATCH RESULT EXISTS'
    END as status_check
FROM bets b
LEFT JOIN match_results mr ON b.match_id = mr.match_id
WHERE b.status = 'lost'
  AND b.resolved_at IS NOT NULL
ORDER BY b.resolved_at DESC
LIMIT 10;
```

**This is the most likely issue!** If `match_result_id` is NULL, the function returns early at line 276.

### Step 2: Check User Emails

```sql
-- Check if users have emails
SELECT 
    p.id,
    p.email,
    p.preferred_language,
    CASE 
        WHEN p.email IS NULL THEN 'NO EMAIL - FUNCTION WILL RETURN EARLY'
        ELSE 'EMAIL EXISTS'
    END as status_check
FROM profiles p
WHERE p.id IN (
    SELECT DISTINCT user_id 
    FROM bets 
    WHERE status = 'lost' 
      AND resolved_at IS NOT NULL
);
```

### Step 3: Check Bets Exist

```sql
-- Check if bets exist (they should since we just queried them)
SELECT 
    id,
    user_id,
    match_id,
    status,
    prediction
FROM bets
WHERE id IN (
    '64dcbc1c-1863-4a7e-bdca-6bc7f2f57260',
    'c2a21f22-d0d8-43e4-8af8-cf9d023b3454',
    'ea27d445-0b68-497f-8dee-98d9bc08515b'
);
```

## Step 4: Add Debugging to Function

To see exactly where it's returning, let's add RAISE LOG statements. But first, let's check the PostgreSQL logs in Supabase Dashboard:

1. Go to **Supabase Dashboard** → **Logs** → **Postgres Logs**
2. Filter for `send_prediction_result_email` or `create_bet_notification`
3. Look for log messages like:
   - "User email not found for user..."
   - "Bet not found: ..."
   - "Match result not found for match..."

## Most Likely Issue

Based on the function code, the most likely issue is:

**Line 276: Match result not found** - The function returns early if:
```sql
IF NOT FOUND THEN
    RAISE LOG 'Match result not found for match %', bet_record.match_id;
    RETURN;
END IF;
```

This means the match_results table doesn't have entries for these matches.

## Solution

If match results don't exist, you need to:
1. Check if match results were actually created when match results were added
2. Verify the match_id in bets matches the match_id in match_results

Run the first query to see if match results exist for the resolved bets. That's likely the issue!
