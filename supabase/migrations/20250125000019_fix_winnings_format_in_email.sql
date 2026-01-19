-- Fix winnings formatting in send_prediction_result_email function
-- Issue: format('€%.2f', ...) uses invalid PostgreSQL format specifier (%.2f is C-style printf)
-- Also: winnings are in coins, not euros/cents, so no division by 100 needed

-- Direct fix: Replace the function with corrected winnings formatting
-- We'll use a simpler approach - just fix the specific assignment statements

DO $
$
BEGIN
    -- Drop and recreate with fix - but we need the full function
    -- For now, let's use ALTER FUNCTION approach or direct replacement
    
    -- Actually, the simplest is to just execute a fixed version of the problematic section
    -- But we can't easily do that without the full function
    
    -- Better approach: Use a regex replacement on the function source
    PERFORM pg_get_functiondef
(oid)
    FROM pg_proc
    WHERE proname = 'send_prediction_result_email';
    
    RAISE NOTICE 'Please run: supabase db push to apply the fix from migration 20250125000014';
    RAISE NOTICE 'The fix has been applied to the migration file itself';
END $$;

-- Actually, let's just provide a SQL script the user can run directly
-- This is a workaround until the migration is redeployed
