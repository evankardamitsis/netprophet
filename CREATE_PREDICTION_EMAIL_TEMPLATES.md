# Create Prediction Result Email Templates

## Problem
The emails are failing because the templates `prediction_result_lost` and `prediction_result_won` don't exist in the `email_templates` table.

## Step 1: Check Existing Templates

```sql
-- Check what templates exist
SELECT 
    type,
    language,
    name,
    is_active,
    subject,
    LEFT(html_content, 100) as html_preview
FROM email_templates
WHERE type IN ('prediction_result_lost', 'prediction_result_won', 'winnings_notification')
ORDER BY type, language;
```

## Step 2: Create Missing Templates

You need to create templates for both English and Greek (assuming you support both languages):

### Template Variables Available

Based on the `send_prediction_result_email` function, these variables are available:

- `user_name` - User's first name
- `match_name` - Full match name (e.g., "Player A vs Player B")
- `match_result_details` - Formatted match result with sets
- `predicted_winner` - Who the user predicted would win
- `actual_winner` - Who actually won
- `predicted_result` - User's predicted result (e.g., "2-1")
- `actual_result` - Actual result (e.g., "2-0")
- `loss_reason` - Why the prediction was lost (for lost predictions)
- `winnings_amount` - Amount won (for won predictions, in cents)
- `winnings_amount_formatted` - Formatted amount (for won predictions)

### Template 1: prediction_result_lost (English)

```sql
INSERT INTO email_templates (
    type,
    language,
    name,
    subject,
    html_content,
    text_content,
    is_active,
    variables
) VALUES (
    'prediction_result_lost',
    'en',
    'Prediction Result - Lost',
    'Your prediction for {{match_name}} was incorrect',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prediction Result</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: #dc3545; margin-top: 0;">Prediction Lost</h1>
        <p>Hi {{user_name}},</p>
        <p>Unfortunately, your prediction for <strong>{{match_name}}</strong> was incorrect.</p>
    </div>
    
    <div style="background-color: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #495057; margin-top: 0;">Match Result</h2>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
            {{match_result_details}}
        </div>
        <p><strong>Winner:</strong> {{actual_winner}}</p>
    </div>
    
    <div style="background-color: #fff3cd; padding: 20px; border: 1px solid #ffc107; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #856404; margin-top: 0;">Your Prediction</h2>
        <p><strong>Predicted Winner:</strong> {{predicted_winner}}</p>
        <p><strong>Predicted Result:</strong> {{predicted_result}}</p>
    </div>
    
    <div style="background-color: #f8d7da; padding: 20px; border: 1px solid #dc3545; border-radius: 8px;">
        <h3 style="color: #721c24; margin-top: 0;">Why Your Prediction Was Incorrect</h3>
        <p style="color: #721c24; margin-bottom: 0;">{{loss_reason}}</p>
    </div>
    
    <div style="margin-top: 30px; text-align: center; color: #6c757d; font-size: 14px;">
        <p>Keep trying! Good luck with your next prediction.</p>
        <p style="margin-top: 20px;">
            <a href="https://netprophetapp.com" style="color: #007bff; text-decoration: none;">Visit NetProphet</a>
        </p>
    </div>
</body>
</html>',
    'Prediction Lost

Hi {{user_name}},

Unfortunately, your prediction for {{match_name}} was incorrect.

Match Result:
{{match_result_details}}

Winner: {{actual_winner}}

Your Prediction:
Predicted Winner: {{predicted_winner}}
Predicted Result: {{predicted_result}}

Why Your Prediction Was Incorrect:
{{loss_reason}}

Keep trying! Good luck with your next prediction.

Visit NetProphet: https://netprophetapp.com',
    true,
    '{"user_name": "string", "match_name": "string", "match_result_details": "string", "predicted_winner": "string", "actual_winner": "string", "predicted_result": "string", "actual_result": "string", "loss_reason": "string"}'::jsonb
);
```

### Template 2: prediction_result_lost (Greek)

```sql
INSERT INTO email_templates (
    type,
    language,
    name,
    subject,
    html_content,
    text_content,
    is_active,
    variables
) VALUES (
    'prediction_result_lost',
    'el',
    'Αποτέλεσμα Πρόβλεψης - Χάθηκε',
    'Η πρόβλεψη σου για {{match_name}} ήταν λανθασμένη',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Αποτέλεσμα Πρόβλεψης</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: #dc3545; margin-top: 0;">Η Πρόβλεψη Χάθηκε</h1>
        <p>Γεια σου {{user_name}},</p>
        <p>Δυστυχώς, η πρόβλεψη σου για <strong>{{match_name}}</strong> ήταν λανθασμένη.</p>
    </div>
    
    <div style="background-color: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #495057; margin-top: 0;">Αποτέλεσμα Αγώνα</h2>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
            {{match_result_details}}
        </div>
        <p><strong>Νικητής:</strong> {{actual_winner}}</p>
    </div>
    
    <div style="background-color: #fff3cd; padding: 20px; border: 1px solid #ffc107; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #856404; margin-top: 0;">Η Πρόβλεψη Σου</h2>
        <p><strong>Προβλεπόμενος Νικητής:</strong> {{predicted_winner}}</p>
        <p><strong>Προβλεπόμενο Αποτέλεσμα:</strong> {{predicted_result}}</p>
    </div>
    
    <div style="background-color: #f8d7da; padding: 20px; border: 1px solid #dc3545; border-radius: 8px;">
        <h3 style="color: #721c24; margin-top: 0;">Γιατί Η Πρόβλεψη Σου Ήταν Λανθασμένη</h3>
        <p style="color: #721c24; margin-bottom: 0;">{{loss_reason}}</p>
    </div>
    
    <div style="margin-top: 30px; text-align: center; color: #6c757d; font-size: 14px;">
        <p>Συνέχισε! Καλή τύχη στην επόμενη πρόβλεψη σου.</p>
        <p style="margin-top: 20px;">
            <a href="https://netprophetapp.com" style="color: #007bff; text-decoration: none;">Επισκεφτείτε το NetProphet</a>
        </p>
    </div>
</body>
</html>',
    'Η Πρόβλεψη Χάθηκε

Γεια σου {{user_name}},

Δυστυχώς, η πρόβλεψη σου για {{match_name}} ήταν λανθασμένη.

Αποτέλεσμα Αγώνα:
{{match_result_details}}

Νικητής: {{actual_winner}}

Η Πρόβλεψη Σου:
Προβλεπόμενος Νικητής: {{predicted_winner}}
Προβλεπόμενο Αποτέλεσμα: {{predicted_result}}

Γιατί Η Πρόβλεψη Σου Ήταν Λανθασμένη:
{{loss_reason}}

Συνέχισε! Καλή τύχη στην επόμενη πρόβλεψη σου.

Επισκεφτείτε το NetProphet: https://netprophetapp.com',
    true,
    '{"user_name": "string", "match_name": "string", "match_result_details": "string", "predicted_winner": "string", "actual_winner": "string", "predicted_result": "string", "actual_result": "string", "loss_reason": "string"}'::jsonb
);
```

### Template 3: prediction_result_won (English)

```sql
INSERT INTO email_templates (
    type,
    language,
    name,
    subject,
    html_content,
    text_content,
    is_active,
    variables
) VALUES (
    'prediction_result_won',
    'en',
    'Prediction Result - Won',
    'Congratulations! Your prediction for {{match_name}} was correct',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prediction Result</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #c3e6cb;">
        <h1 style="color: #155724; margin-top: 0;">🎉 Prediction Won!</h1>
        <p>Congratulations {{user_name}}!</p>
        <p>Your prediction for <strong>{{match_name}}</strong> was correct!</p>
    </div>
    
    <div style="background-color: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #495057; margin-top: 0;">Match Result</h2>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
            {{match_result_details}}
        </div>
        <p><strong>Winner:</strong> {{actual_winner}}</p>
    </div>
    
    <div style="background-color: #d4edda; padding: 20px; border: 1px solid #28a745; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #155724; margin-top: 0;">Your Winning Prediction</h2>
        <p><strong>Predicted Winner:</strong> {{predicted_winner}}</p>
        <p><strong>Predicted Result:</strong> {{predicted_result}}</p>
        <p style="font-size: 20px; font-weight: bold; color: #28a745; margin-top: 15px; margin-bottom: 0;">
            Winnings: {{winnings_amount_formatted}}
        </p>
    </div>
    
    <div style="margin-top: 30px; text-align: center; color: #6c757d; font-size: 14px;">
        <p>Great job! Your winnings have been added to your account balance.</p>
        <p style="margin-top: 20px;">
            <a href="https://netprophetapp.com" style="color: #007bff; text-decoration: none;">Visit NetProphet</a>
        </p>
    </div>
</body>
</html>',
    'Prediction Won!

Congratulations {{user_name}}!

Your prediction for {{match_name}} was correct!

Match Result:
{{match_result_details}}

Winner: {{actual_winner}}

Your Winning Prediction:
Predicted Winner: {{predicted_winner}}
Predicted Result: {{predicted_result}}

Winnings: {{winnings_amount_formatted}}

Great job! Your winnings have been added to your account balance.

Visit NetProphet: https://netprophetapp.com',
    true,
    '{"user_name": "string", "match_name": "string", "match_result_details": "string", "predicted_winner": "string", "actual_winner": "string", "predicted_result": "string", "actual_result": "string", "winnings_amount": "number", "winnings_amount_formatted": "string"}'::jsonb
);
```

### Template 4: prediction_result_won (Greek)

```sql
INSERT INTO email_templates (
    type,
    language,
    name,
    subject,
    html_content,
    text_content,
    is_active,
    variables
) VALUES (
    'prediction_result_won',
    'el',
    'Αποτέλεσμα Πρόβλεψης - Κέρδισε',
    'Συγχαρητήρια! Η πρόβλεψη σου για {{match_name}} ήταν σωστή',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Αποτέλεσμα Πρόβλεψης</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #c3e6cb;">
        <h1 style="color: #155724; margin-top: 0;">🎉 Η Πρόβλεψη Κέρδισε!</h1>
        <p>Συγχαρητήρια {{user_name}}!</p>
        <p>Η πρόβλεψη σου για <strong>{{match_name}}</strong> ήταν σωστή!</p>
    </div>
    
    <div style="background-color: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #495057; margin-top: 0;">Αποτέλεσμα Αγώνα</h2>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
            {{match_result_details}}
        </div>
        <p><strong>Νικητής:</strong> {{actual_winner}}</p>
    </div>
    
    <div style="background-color: #d4edda; padding: 20px; border: 1px solid #28a745; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #155724; margin-top: 0;">Η Κερδοφόρα Πρόβλεψη Σου</h2>
        <p><strong>Προβλεπόμενος Νικητής:</strong> {{predicted_winner}}</p>
        <p><strong>Προβλεπόμενο Αποτέλεσμα:</strong> {{predicted_result}}</p>
        <p style="font-size: 20px; font-weight: bold; color: #28a745; margin-top: 15px; margin-bottom: 0;">
            Κέρδη: {{winnings_amount_formatted}}
        </p>
    </div>
    
    <div style="margin-top: 30px; text-align: center; color: #6c757d; font-size: 14px;">
        <p>Μπράβο! Τα κέρδη σου προστέθηκαν στον λογαριασμό σου.</p>
        <p style="margin-top: 20px;">
            <a href="https://netprophetapp.com" style="color: #007bff; text-decoration: none;">Επισκεφτείτε το NetProphet</a>
        </p>
    </div>
</body>
</html>',
    'Η Πρόβλεψη Κέρδισε!

Συγχαρητήρια {{user_name}}!

Η πρόβλεψη σου για {{match_name}} ήταν σωστή!

Αποτέλεσμα Αγώνα:
{{match_result_details}}

Νικητής: {{actual_winner}}

Η Κερδοφόρα Πρόβλεψη Σου:
Προβλεπόμενος Νικητής: {{predicted_winner}}
Προβλεπόμενο Αποτέλεσμα: {{predicted_result}}

Κέρδη: {{winnings_amount_formatted}}

Μπράβο! Τα κέρδη σου προστέθηκαν στον λογαριασμό σου.

Επισκεφτείτε το NetProphet: https://netprophetapp.com',
    true,
    '{"user_name": "string", "match_name": "string", "match_result_details": "string", "predicted_winner": "string", "actual_winner": "string", "predicted_result": "string", "actual_result": "string", "winnings_amount": "number", "winnings_amount_formatted": "string"}'::jsonb
);
```

## Step 3: Retry the Failed Email

After creating the templates, retry the failed email:

```sql
-- Reset the failed email to pending
UPDATE email_logs
SET 
    status = 'pending',
    sent_at = NOW(),
    error_message = NULL
WHERE id = 'd72ad968-0d71-4886-a58b-4e09dadbb6d0';
```

Then process it again with curl:

```bash
curl -X POST "https://mgojbigzulgkjomgirrm.supabase.co/functions/v1/process-user-emails" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Notes

- The templates above are basic examples - you can customize the HTML/CSS to match your brand
- Make sure to format `winnings_amount_formatted` as currency (e.g., "€50.00" or "50.00€") in the `send_prediction_result_email` function
- The templates support both English and Greek languages
