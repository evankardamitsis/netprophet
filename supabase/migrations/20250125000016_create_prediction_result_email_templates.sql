-- Create email templates for prediction result emails
-- These templates will be used when users receive emails about their bet outcomes

-- Template 1: prediction_result_lost (English)
INSERT INTO email_templates (
    type,
    language,
    name,
    subject,
    html_content,
    text_content,
    is_active,
    variables,
    version
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
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
    <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header with Logo -->
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #dee2e6;">
            <img src="https://netprophetapp.com/net-prophet-logo-with-icon.svg" alt="NetProphet Logo" style="height: 50px; width: auto; margin-bottom: 10px;">
        </div>
        
        <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc3545;">
            <h1 style="color: #721c24; margin-top: 0; font-size: 24px;">❌ Prediction Lost</h1>
            <p style="color: #721c24; margin-bottom: 0;">Hi {{user_name}},</p>
            <p style="color: #721c24; margin-top: 10px;">Unfortunately, your prediction for <strong>{{match_name}}</strong> was incorrect.</p>
        </div>
        
        <!-- Comparison Section -->
        <div style="background-color: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #495057; margin-top: 0; font-size: 18px; text-align: center; margin-bottom: 20px;">📊 Your Prediction vs Actual Result</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6; font-weight: 600; color: #495057; width: 50%;">Your Prediction</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6; font-weight: 600; color: #495057; width: 50%;">Actual Result</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #dee2e6; background-color: #fff3cd;">
                            <strong style="color: #856404;">Winner:</strong><br>
                            <span style="color: #721c24;">{{predicted_winner}}</span>
                        </td>
                        <td style="padding: 12px; border: 1px solid #dee2e6; background-color: #f8f9fa;">
                            <strong style="color: #495057;">Winner:</strong><br>
                            <span style="color: #28a745; font-weight: 600;">{{actual_winner}}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #dee2e6; background-color: #fff3cd;">
                            <strong style="color: #856404;">Match Score:</strong><br>
                            <span style="color: #721c24;">{{predicted_result}}</span>
                        </td>
                        <td style="padding: 12px; border: 1px solid #dee2e6; background-color: #f8f9fa;">
                            <strong style="color: #495057;">Match Score:</strong><br>
                            <span style="color: #28a745; font-weight: 600;">{{actual_result}}</span>
                        </td>
                    </tr>
                </tbody>
            </table>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 15px; white-space: pre-line; font-family: monospace; font-size: 14px;">
                <strong>Detailed Match Result:</strong><br>
                {{match_result_details}}
            </div>
        </div>
        
        <!-- Loss Reason Section -->
        <div style="background-color: #f8d7da; padding: 20px; border: 1px solid #dc3545; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #721c24; margin-top: 0; font-size: 18px; margin-bottom: 10px;">❌ Why Your Prediction Was Incorrect</h3>
            <div style="background-color: #fff; padding: 15px; border-radius: 4px; border-left: 4px solid #dc3545;">
                <p style="color: #721c24; margin: 0; white-space: pre-line; line-height: 1.8;">{{loss_reason}}</p>
            </div>
        </div>
        
        <div style="margin-top: 30px; text-align: center; color: #6c757d; font-size: 14px; border-top: 1px solid #dee2e6; padding-top: 20px;">
            <p style="margin-bottom: 10px;">Keep trying! Good luck with your next prediction. 🍀</p>
            <p style="margin-top: 15px;">
                <a href="https://netprophetapp.com" style="color: #007bff; text-decoration: none; font-weight: bold;">Visit NetProphet</a>
            </p>
        </div>
    </div>
</body>
</html>',
    'Prediction Lost

Hi {{user_name}},

Unfortunately, your prediction for {{match_name}} was incorrect.

Match Result:
{{match_result_details}}

Actual Winner: {{actual_winner}}
Match Result: {{actual_result}}

Your Prediction:
Predicted Winner: {{predicted_winner}}
Predicted Result: {{predicted_result}}

Why Your Prediction Was Incorrect:
{{loss_reason}}

Keep trying! Good luck with your next prediction.

Visit NetProphet: https://netprophetapp.com',
    true,
    '{"user_name": "string", "match_name": "string", "match_result_details": "string", "predicted_winner": "string", "actual_winner": "string", "predicted_result": "string", "actual_result": "string", "loss_reason": "string"}'::jsonb,
    1
)
ON CONFLICT (type, language, version) DO UPDATE SET
    name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content,
    text_content = EXCLUDED.text_content,
    is_active = EXCLUDED.is_active,
    variables = EXCLUDED.variables;

-- Template 2: prediction_result_lost (Greek)
INSERT INTO email_templates (
    type,
    language,
    name,
    subject,
    html_content,
    text_content,
    is_active,
    variables,
    version
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
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
    <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header with Logo -->
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #dee2e6;">
            <img src="https://netprophetapp.com/net-prophet-logo-with-icon.svg" alt="NetProphet Logo" style="height: 50px; width: auto; margin-bottom: 10px;">
        </div>
        
        <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc3545;">
            <h1 style="color: #721c24; margin-top: 0; font-size: 24px;">❌ Η Πρόβλεψη Χάθηκε</h1>
            <p style="color: #721c24; margin-bottom: 0;">Γεια σου {{user_name}},</p>
            <p style="color: #721c24; margin-top: 10px;">Δυστυχώς, η πρόβλεψη σου για <strong>{{match_name}}</strong> ήταν λανθασμένη.</p>
        </div>
        
        <!-- Comparison Section -->
        <div style="background-color: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #495057; margin-top: 0; font-size: 18px; text-align: center; margin-bottom: 20px;">📊 Η Πρόβλεψη Σου vs Πραγματικό Αποτέλεσμα</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color: #f8f9fa;">
                        <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6; font-weight: 600; color: #495057; width: 50%;">Η Πρόβλεψη Σου</th>
                        <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6; font-weight: 600; color: #495057; width: 50%;">Πραγματικό Αποτέλεσμα</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #dee2e6; background-color: #fff3cd;">
                            <strong style="color: #856404;">Νικητής:</strong><br>
                            <span style="color: #721c24;">{{predicted_winner}}</span>
                        </td>
                        <td style="padding: 12px; border: 1px solid #dee2e6; background-color: #f8f9fa;">
                            <strong style="color: #495057;">Νικητής:</strong><br>
                            <span style="color: #28a745; font-weight: 600;">{{actual_winner}}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #dee2e6; background-color: #fff3cd;">
                            <strong style="color: #856404;">Σκορ Αγώνα:</strong><br>
                            <span style="color: #721c24;">{{predicted_result}}</span>
                        </td>
                        <td style="padding: 12px; border: 1px solid #dee2e6; background-color: #f8f9fa;">
                            <strong style="color: #495057;">Σκορ Αγώνα:</strong><br>
                            <span style="color: #28a745; font-weight: 600;">{{actual_result}}</span>
                        </td>
                    </tr>
                </tbody>
            </table>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 15px; white-space: pre-line; font-family: monospace; font-size: 14px;">
                <strong>Αναλυτικά Αποτελέσματα:</strong><br>
                {{match_result_details}}
            </div>
        </div>
        
        <!-- Loss Reason Section -->
        <div style="background-color: #f8d7da; padding: 20px; border: 1px solid #dc3545; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #721c24; margin-top: 0; font-size: 18px; margin-bottom: 10px;">❌ Γιατί Η Πρόβλεψη Σου Ήταν Λανθασμένη</h3>
            <div style="background-color: #fff; padding: 15px; border-radius: 4px; border-left: 4px solid #dc3545;">
                <p style="color: #721c24; margin: 0; white-space: pre-line; line-height: 1.8;">{{loss_reason}}</p>
            </div>
        </div>
        
        <div style="margin-top: 30px; text-align: center; color: #6c757d; font-size: 14px; border-top: 1px solid #dee2e6; padding-top: 20px;">
            <p style="margin-bottom: 10px;">Συνέχισε! Καλή τύχη στην επόμενη πρόβλεψη σου. 🍀</p>
            <p style="margin-top: 15px;">
                <a href="https://netprophetapp.com" style="color: #007bff; text-decoration: none; font-weight: bold;">Επισκεφτείτε το NetProphet</a>
            </p>
        </div>
    </div>
</body>
</html>',
    'Η Πρόβλεψη Χάθηκε

Γεια σου {{user_name}},

Δυστυχώς, η πρόβλεψη σου για {{match_name}} ήταν λανθασμένη.

Αποτέλεσμα Αγώνα:
{{match_result_details}}

Πραγματικός Νικητής: {{actual_winner}}
Αποτέλεσμα Αγώνα: {{actual_result}}

Η Πρόβλεψη Σου:
Προβλεπόμενος Νικητής: {{predicted_winner}}
Προβλεπόμενο Αποτέλεσμα: {{predicted_result}}

Γιατί Η Πρόβλεψη Σου Ήταν Λανθασμένη:
{{loss_reason}}

Συνέχισε! Καλή τύχη στην επόμενη πρόβλεψη σου.

Επισκεφτείτε το NetProphet: https://netprophetapp.com',
    true,
    '{"user_name": "string", "match_name": "string", "match_result_details": "string", "predicted_winner": "string", "actual_winner": "string", "predicted_result": "string", "actual_result": "string", "loss_reason": "string"}'::jsonb,
    1
)
ON CONFLICT (type, language, version) DO UPDATE SET
    name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content,
    text_content = EXCLUDED.text_content,
    is_active = EXCLUDED.is_active,
    variables = EXCLUDED.variables;

-- Template 3: prediction_result_won (English)
INSERT INTO email_templates (
    type,
    language,
    name,
    subject,
    html_content,
    text_content,
    is_active,
    variables,
    version
) VALUES (
    'prediction_result_won',
    'en',
    'Prediction Result - Won',
    '🎉 Congratulations! Your prediction for {{match_name}} was correct',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prediction Result</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
    <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header with Logo -->
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #dee2e6;">
            <img src="https://netprophetapp.com/net-prophet-logo-with-icon.svg" alt="NetProphet Logo" style="height: 50px; width: auto; margin-bottom: 10px;">
        </div>
        
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #28a745;">
            <h1 style="color: #155724; margin-top: 0; font-size: 24px;">🎉 Prediction Won!</h1>
            <p style="color: #155724; margin-bottom: 0;">Congratulations {{user_name}}!</p>
            <p style="color: #155724; margin-top: 10px;">Your prediction for <strong>{{match_name}}</strong> was correct!</p>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #495057; margin-top: 0; font-size: 18px;">📊 Match Result</h2>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 15px; white-space: pre-line; font-family: monospace;">
                {{match_result_details}}
            </div>
            <p style="margin-bottom: 5px;"><strong>Winner:</strong> {{actual_winner}}</p>
            <p style="margin-top: 5px; margin-bottom: 0;"><strong>Match Result:</strong> {{actual_result}}</p>
        </div>
        
        <div style="background-color: #d4edda; padding: 20px; border: 1px solid #28a745; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #155724; margin-top: 0; font-size: 18px;">🎯 Your Winning Prediction</h2>
            <p style="margin-bottom: 5px;"><strong>Predicted Winner:</strong> {{predicted_winner}}</p>
            <p style="margin-top: 5px; margin-bottom: 10px;"><strong>Predicted Result:</strong> {{predicted_result}}</p>
            <div style="background-color: #28a745; color: white; padding: 15px; border-radius: 4px; text-align: center; margin-top: 15px;">
                <p style="margin: 0; font-size: 12px; opacity: 0.9;">Your Winnings</p>
                <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: bold;">{{winnings_formatted}}</p>
            </div>
        </div>
        
        <div style="margin-top: 30px; text-align: center; color: #6c757d; font-size: 14px; border-top: 1px solid #dee2e6; padding-top: 20px;">
            <p style="margin-bottom: 10px;">Great job! Your winnings have been added to your account balance. 💰</p>
            <p style="margin-top: 15px;">
                <a href="https://netprophetapp.com" style="color: #007bff; text-decoration: none; font-weight: bold;">Visit NetProphet</a>
            </p>
        </div>
    </div>
</body>
</html>',
    'Prediction Won!

Congratulations {{user_name}}!

Your prediction for {{match_name}} was correct!

Match Result:
{{match_result_details}}

Winner: {{actual_winner}}
Match Result: {{actual_result}}

Your Winning Prediction:
Predicted Winner: {{predicted_winner}}
Predicted Result: {{predicted_result}}

Your Winnings: {{winnings_formatted}}

Great job! Your winnings have been added to your account balance.

Visit NetProphet: https://netprophetapp.com',
    true,
    '{"user_name": "string", "match_name": "string", "match_result_details": "string", "predicted_winner": "string", "actual_winner": "string", "predicted_result": "string", "actual_result": "string", "winnings": "number", "winnings_formatted": "string"}'::jsonb,
    1
)
ON CONFLICT (type, language, version) DO UPDATE SET
    name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content,
    text_content = EXCLUDED.text_content,
    is_active = EXCLUDED.is_active,
    variables = EXCLUDED.variables;

-- Template 4: prediction_result_won (Greek)
INSERT INTO email_templates (
    type,
    language,
    name,
    subject,
    html_content,
    text_content,
    is_active,
    variables,
    version
) VALUES (
    'prediction_result_won',
    'el',
    'Αποτέλεσμα Πρόβλεψης - Κέρδισε',
    '🎉 Συγχαρητήρια! Η πρόβλεψη σου για {{match_name}} ήταν σωστή',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Αποτέλεσμα Πρόβλεψης</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
    <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header with Logo -->
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #dee2e6;">
            <img src="https://netprophetapp.com/net-prophet-logo-with-icon.svg" alt="NetProphet Logo" style="height: 50px; width: auto; margin-bottom: 10px;">
        </div>
        
        <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #28a745;">
            <h1 style="color: #155724; margin-top: 0; font-size: 24px;">🎉 Η Πρόβλεψη Κέρδισε!</h1>
            <p style="color: #155724; margin-bottom: 0;">Συγχαρητήρια {{user_name}}!</p>
            <p style="color: #155724; margin-top: 10px;">Η πρόβλεψη σου για <strong>{{match_name}}</strong> ήταν σωστή!</p>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #495057; margin-top: 0; font-size: 18px;">📊 Αποτέλεσμα Αγώνα</h2>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 15px; white-space: pre-line; font-family: monospace;">
                {{match_result_details}}
            </div>
            <p style="margin-bottom: 5px;"><strong>Νικητής:</strong> {{actual_winner}}</p>
            <p style="margin-top: 5px; margin-bottom: 0;"><strong>Αποτέλεσμα Αγώνα:</strong> {{actual_result}}</p>
        </div>
        
        <div style="background-color: #d4edda; padding: 20px; border: 1px solid #28a745; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #155724; margin-top: 0; font-size: 18px;">🎯 Η Κερδοφόρα Πρόβλεψη Σου</h2>
            <p style="margin-bottom: 5px;"><strong>Προβλεπόμενος Νικητής:</strong> {{predicted_winner}}</p>
            <p style="margin-top: 5px; margin-bottom: 10px;"><strong>Προβλεπόμενο Αποτέλεσμα:</strong> {{predicted_result}}</p>
            <div style="background-color: #28a745; color: white; padding: 15px; border-radius: 4px; text-align: center; margin-top: 15px;">
                <p style="margin: 0; font-size: 12px; opacity: 0.9;">Τα Κέρδη Σου</p>
                <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: bold;">{{winnings_formatted}}</p>
            </div>
        </div>
        
        <div style="margin-top: 30px; text-align: center; color: #6c757d; font-size: 14px; border-top: 1px solid #dee2e6; padding-top: 20px;">
            <p style="margin-bottom: 10px;">Μπράβο! Τα κέρδη σου προστέθηκαν στον λογαριασμό σου. 💰</p>
            <p style="margin-top: 15px;">
                <a href="https://netprophetapp.com" style="color: #007bff; text-decoration: none; font-weight: bold;">Επισκεφτείτε το NetProphet</a>
            </p>
        </div>
    </div>
</body>
</html>',
    'Η Πρόβλεψη Κέρδισε!

Συγχαρητήρια {{user_name}}!

Η πρόβλεψη σου για {{match_name}} ήταν σωστή!

Αποτέλεσμα Αγώνα:
{{match_result_details}}

Νικητής: {{actual_winner}}
Αποτέλεσμα Αγώνα: {{actual_result}}

Η Κερδοφόρα Πρόβλεψη Σου:
Προβλεπόμενος Νικητής: {{predicted_winner}}
Προβλεπόμενο Αποτέλεσμα: {{predicted_result}}

Τα Κέρδη Σου: {{winnings_formatted}}

Μπράβο! Τα κέρδη σου προστέθηκαν στον λογαριασμό σου.

Επισκεφτείτε το NetProphet: https://netprophetapp.com',
    true,
    '{"user_name": "string", "match_name": "string", "match_result_details": "string", "predicted_winner": "string", "actual_winner": "string", "predicted_result": "string", "actual_result": "string", "winnings": "number", "winnings_formatted": "string"}'::jsonb,
    1
)
ON CONFLICT (type, language, version) DO UPDATE SET
    name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content,
    text_content = EXCLUDED.text_content,
    is_active = EXCLUDED.is_active,
    variables = EXCLUDED.variables;
