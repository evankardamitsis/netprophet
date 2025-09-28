-- Fix the app_url in the welcome email template
-- Update the default variables to use the correct domain

UPDATE email_templates 
SET variables = '{
  "app_url": "https://netprophetapp.com",
  "user_name": "New User",
  "user_email": "user@example.com",
  "welcome_bonus_coins": 100,
  "welcome_bonus_pass": "Tournament Pass"
}'
WHERE type = 'welcome_email' AND language = 'en';
