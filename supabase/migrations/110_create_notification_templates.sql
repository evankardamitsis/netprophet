-- Create notification templates table for editable notification texts
CREATE TABLE
IF NOT EXISTS public.notification_templates
(
    id UUID DEFAULT gen_random_uuid
() PRIMARY KEY,
    type TEXT NOT NULL, -- e.g., 'match_cancelled', 'bet_won', 'bet_lost'
    language TEXT NOT NULL DEFAULT 'en', -- 'en' or 'el'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP
WITH TIME ZONE DEFAULT NOW
() NOT NULL,
    updated_at TIMESTAMP
WITH TIME ZONE DEFAULT NOW
() NOT NULL
);

-- Create unique constraint for type + language combination
CREATE UNIQUE INDEX
IF NOT EXISTS idx_notification_templates_type_lang_unique ON public.notification_templates
(type, language);

-- Create index for efficient lookups
CREATE INDEX
IF NOT EXISTS idx_notification_templates_type_lang ON public.notification_templates
(type, language);

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification templates
-- Only admins can manage notification templates
CREATE POLICY "Admins can manage notification templates" ON public.notification_templates
    FOR ALL USING
(auth.uid
() IN
(
        SELECT id
FROM profiles
WHERE is_admin = true
    )
);

-- Insert default notification templates
INSERT INTO public.notification_templates
    (type, language, title, message)
VALUES
    -- Match cancelled notifications
    ('match_cancelled', 'en', '🚫 Match Cancelled', 'The match {player_a} vs {player_b} has been cancelled. Your bet has been refunded.'),
    ('match_cancelled', 'el', '🚫 Ακύρωση Αγώνα', 'Ο αγώνας {player_a} vs {player_b} ακυρώθηκε. Το στοίχημά σου επιστράφηκε.'),

    -- Bet won notifications
    ('bet_won', 'en', '🎉 Your prediction won!', 'Congratulations! Your prediction on {player_a} vs {player_b} has been won.'),
    ('bet_won', 'el', '🎉 Η πρόβλεψη σου κέρδισε!', 'Συγχαρητήρια! Η πρόβλεψη σου για {player_a} vs {player_b} κέρδισε.'),

    -- Bet lost notifications
    ('bet_lost', 'en', '❌ Bet Lost', 'Your bet on {player_a} vs {player_b} has been lost. Better luck next time!'),
    ('bet_lost', 'el', '❌ Το Στοίχημα Έχασε', 'Το στοίχημά σου για {player_a} vs {player_b} έχασε. Καλή τύχη την επόμενη φορά!'),

    -- Bet resolved notifications
    ('bet_resolved', 'en', '📊 Prediction Resolved', 'Your prediction on {player_a} vs {player_b} has been resolved.'),
    ('bet_resolved', 'el', '📊 Η πρόβλεψη σου επιλύθηκε', 'Η πρόβλεψη σου για {player_a} vs {player_b} επιλύθηκε.');

-- Create function to get notification template
CREATE OR REPLACE FUNCTION get_notification_template
(template_type TEXT, user_language TEXT DEFAULT 'en')
RETURNS TABLE
(title TEXT, message TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT nt.title, nt.message
    FROM public.notification_templates nt
    WHERE nt.type = template_type
        AND nt.language = user_language
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_notification_template
(TEXT, TEXT) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.notification_templates IS 'Editable notification templates for different notification types and languages';
COMMENT ON FUNCTION get_notification_template
(TEXT, TEXT) IS 'Gets notification template for a specific type and language';
