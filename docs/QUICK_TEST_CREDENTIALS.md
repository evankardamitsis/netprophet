# Quick Test Credentials

**Test User ID:** `0fd82e0f-6144-4504-b580-b4a65a079d91`  
**Test Email:** `kardamitsis.e@gmail.com`

---

## Quick Test Queries

### Welcome Email (Greek) ✅ Tested - Works
```sql
INSERT INTO email_logs (user_id, to_email, template, type, language, variables, status)
VALUES (
    '0fd82e0f-6144-4504-b580-b4a65a079d91',
    'kardamitsis.e@gmail.com',
    'welcome_email',
    'user',
    'el',
    jsonb_build_object(
        'user_name', 'Δοκιμαστικός Χρήστης',
        'user_email', 'kardamitsis.e@gmail.com',
        'user_id', '0fd82e0f-6144-4504-b580-b4a65a079d91',
        'welcome_bonus_coins', 100,
        'welcome_bonus_pass', 'Tournament Pass',
        'app_url', 'https://netprophetapp.com'
    ),
    'pending'
);
```

### Prediction Result - Won
```sql
INSERT INTO email_logs (user_id, to_email, template, type, language, variables, status)
VALUES (
    '0fd82e0f-6144-4504-b580-b4a65a079d91',
    'kardamitsis.e@gmail.com',
    'prediction_result_won',
    'user',
    'en',
    jsonb_build_object(
        'user_name', 'Test User',
        'match_name', 'Djokovic vs Nadal - Australian Open Final',
        'predicted_winner', 'Djokovic',
        'predicted_result', '3-1',
        'actual_winner', 'Djokovic',
        'actual_result', '3-1',
        'match_result_details', 'Djokovic won 6-4, 4-6, 6-3, 6-4',
        'winnings', 50.00,
        'winnings_formatted', '$50.00',
        'bet_amount', 10.00
    ),
    'pending'
);
```

### Prediction Result - Lost
```sql
INSERT INTO email_logs (user_id, to_email, template, type, language, variables, status)
VALUES (
    '0fd82e0f-6144-4504-b580-b4a65a079d91',
    'kardamitsis.e@gmail.com',
    'prediction_result_lost',
    'user',
    'en',
    jsonb_build_object(
        'user_name', 'Test User',
        'match_name', 'Djokovic vs Nadal - Australian Open Final',
        'predicted_winner', 'Djokovic',
        'predicted_result', '3-0',
        'actual_winner', 'Nadal',
        'actual_result', '3-2',
        'match_result_details', 'Nadal won 4-6, 6-3, 6-7, 7-5, 6-4',
        'loss_reason', 'Incorrect winner prediction'
    ),
    'pending'
);
```

### Profile Claim Confirmation
```sql
INSERT INTO email_logs (user_id, to_email, template, type, language, variables, status)
VALUES (
    '0fd82e0f-6144-4504-b580-b4a65a079d91',
    'kardamitsis.e@gmail.com',
    'profile_claim_confirmation',
    'user',
    'en',
    jsonb_build_object(
        'user_name', 'Test User',
        'user_email', 'kardamitsis.e@gmail.com',
        'player_first_name', 'John',
        'player_last_name', 'Doe',
        'player_full_name', 'John Doe',
        'app_url', 'https://netprophetapp.com'
    ),
    'pending'
);
```

### Profile Creation Confirmation
```sql
INSERT INTO email_logs (user_id, to_email, template, type, language, variables, status)
VALUES (
    '0fd82e0f-6144-4504-b580-b4a65a079d91',
    'kardamitsis.e@gmail.com',
    'profile_creation_confirmation',
    'user',
    'en',
    jsonb_build_object(
        'user_name', 'Test User',
        'user_email', 'kardamitsis.e@gmail.com',
        'requested_first_name', 'John',
        'requested_last_name', 'Doe',
        'requested_full_name', 'John Doe',
        'app_url', 'https://netprophetapp.com'
    ),
    'pending'
);
```

### Profile Activated
```sql
INSERT INTO email_logs (user_id, to_email, template, type, language, variables, status)
VALUES (
    '0fd82e0f-6144-4504-b580-b4a65a079d91',
    'kardamitsis.e@gmail.com',
    'profile_activated',
    'user',
    'en',
    jsonb_build_object(
        'user_name', 'Test User',
        'player_first_name', 'John',
        'player_last_name', 'Doe',
        'player_id', '12345',
        'language', 'en'
    ),
    'pending'
);
```

### Promotional Email
```sql
INSERT INTO email_logs (user_id, to_email, template, type, language, variables, status)
VALUES (
    '0fd82e0f-6144-4504-b580-b4a65a079d91',
    'kardamitsis.e@gmail.com',
    'promotional',
    'user',
    'en',
    jsonb_build_object(
        'user_email', 'kardamitsis.e@gmail.com'
    ),
    'pending'
);
```

---

## Check Results

```sql
SELECT id, to_email, template, language, status, error_message, sent_at
FROM email_logs
WHERE to_email = 'kardamitsis.e@gmail.com'
ORDER BY sent_at DESC NULLS LAST, id DESC
LIMIT 10;
```
