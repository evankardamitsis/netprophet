# User Email Processing Updates

## ✅ Completed

### 1. Added Rate Limiting to `process-user-emails`
- **Location**: `supabase/functions/process-user-emails/index.ts`
- **Changes**:
  - Added 600ms delay between emails (respects Resend's 2 req/sec limit)
  - Added automatic retry with exponential backoff (1s, 2s, 4s) for rate limit errors
  - Rate limit errors (429) now trigger automatic retries

### 2. Removed 50 Email Limit
- **Location**: `supabase/functions/process-user-emails/index.ts`
- **Change**: Removed `.limit(50)` so all pending emails are processed in one run

## 🔄 Next Steps

### 1. Deploy Updated Edge Function

```bash
cd /Users/VKardamitsis/Projects/netprophet
supabase functions deploy process-user-emails
```

### 2. Create Database Function for Prediction Result Emails

You need to create a database function that sends emails when bets/predictions are resolved. Currently, `create_bet_notification` only creates in-app notifications.

**Suggested Approach**: Create a function `send_prediction_result_email` that:

1. Gets called when a bet's status changes to 'won' or 'lost'
2. Creates an entry in `email_logs` with:
   - `type = 'user'`
   - `template = 'prediction_result'` (or 'bet_won' / 'bet_lost')
   - `status = 'pending'`
   - `variables` containing:
     - Match details (player names, tournament)
     - Prediction details
     - Outcome (won/lost)
     - Winnings (if won)
     - Language preference

3. The webhook will automatically trigger `process-user-emails` edge function

### 3. Create Email Templates

Create email templates in `email_templates` table:
- `prediction_result_won` (or `bet_won`)
- `prediction_result_lost` (or `bet_lost`)

With variables like:
- `match_name` - e.g., "Player A vs Player B" or "Team A vs Team B"
- `tournament_name`
- `prediction` - what the user predicted
- `winnings` - amount won (if applicable)
- `bet_amount` - amount staked
- `result` - match result summary

### 4. Create Trigger or Update Existing Function

Update the function that resolves bets (when match results are added) to also call `send_prediction_result_email`.

**Check**: Where are bets actually resolved? Look for:
- Functions that UPDATE bets SET status = 'won' or 'lost'
- Triggers on `match_results` table that resolve bets
- Functions like `resolve_bets_for_match`

## 📋 Current User Email Flow

1. **Welcome emails**: ✅ Already working via `send_welcome_email_to_user()`
2. **Profile claim emails**: ✅ Already working via `send_profile_claim_confirmation_email()`
3. **Profile creation emails**: ✅ Already working via `send_profile_creation_confirmation_email()`
4. **Prediction result emails**: ❌ **NEEDS TO BE ADDED**

## 🔍 Where to Check

1. **Bet Resolution**: Look for where `bets.status` is updated to 'won' or 'lost'
2. **Match Result Processing**: Check triggers/functions that run when `match_results` are inserted
3. **Notification Creation**: The `create_bet_notification` function shows the pattern - create a similar one for emails

## 📝 Example Function Structure

```sql
CREATE OR REPLACE FUNCTION send_prediction_result_email(
    user_uuid UUID,
    bet_id UUID,
    match_id UUID,
    bet_status TEXT, -- 'won' or 'lost'
    winnings_amount INTEGER DEFAULT 0
)
RETURNS void AS $$
DECLARE
    user_email TEXT;
    user_language TEXT;
    match_details RECORD;
    template_name TEXT;
    template_variables JSONB;
BEGIN
    -- Get user email and language preference
    SELECT email, COALESCE(preferred_language, 'en')
    INTO user_email, user_language
    FROM profiles
    WHERE id = user_uuid;
    
    -- Get match details (handles both singles and doubles)
    -- ... fetch match info ...
    
    -- Determine template name
    template_name := CASE 
        WHEN bet_status = 'won' THEN 'prediction_result_won'
        ELSE 'prediction_result_lost'
    END;
    
    -- Build template variables
    template_variables := jsonb_build_object(
        'match_name', match_details.match_display_name,
        'tournament_name', match_details.tournament_name,
        'prediction', -- ... get from bet.prediction ...
        'winnings', winnings_amount,
        'bet_amount', -- ... get from bet.bet_amount ...
        'result', -- ... formatted match result ...
    );
    
    -- Insert email log
    INSERT INTO email_logs (
        user_id,
        to_email,
        template,
        type,
        language,
        variables,
        status
    ) VALUES (
        user_uuid,
        user_email,
        template_name,
        'user',
        user_language,
        template_variables,
        'pending'
    );
END;
$$ LANGUAGE plpgsql;
```

This will be automatically processed by the webhook → `process-user-emails` edge function.

## 🎯 Summary

✅ **User email processing is now ready** with rate limiting and no limits
⏭️ **Next**: Create functions to log prediction result emails to `email_logs` table
🔔 **Then**: Webhook will automatically process them via `process-user-emails`
