-- Add welcome bonus notification templates
-- This adds localized templates for welcome bonus notifications

-- Insert welcome bonus notification templates
INSERT INTO public.notification_templates
    (type, language, title, message)
VALUES
    -- English welcome bonus notification
    ('welcome_bonus', 'en', 'Welcome Bonus Available! 🎉', 'Claim your {amount} coin welcome bonus{pass}!'),

    -- Greek welcome bonus notification
    ('welcome_bonus', 'el', 'Μπόνους Καλωσορίσματος Διαθέσιμο! 🎉', 'Πάρε το μπόνους καλωσορίσματος των {amount} νομισμάτων{pass}!');

