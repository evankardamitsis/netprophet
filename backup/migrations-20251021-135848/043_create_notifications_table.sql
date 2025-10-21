-- Create notifications table for user notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('bet_won', 'bet_lost', 'bet_resolved', 'match_result', 'match_cancelled', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional data like bet_id, match_id, winnings, etc.
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- System can insert notifications for users
CREATE POLICY "System can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- Create a function to create bet resolution notifications
CREATE OR REPLACE FUNCTION create_bet_notification(
    user_uuid UUID,
    bet_id UUID,
    bet_status TEXT,
    winnings_amount INTEGER DEFAULT 0
)
RETURNS void AS $$
DECLARE
    notification_title TEXT;
    notification_message TEXT;
    notification_data JSONB;
BEGIN
    -- Determine notification content based on bet status
    CASE bet_status
        WHEN 'won' THEN
            notification_title := '🎉 Bet Won!';
            notification_message := 'Congratulations! Your bet has been won.';
            notification_data := jsonb_build_object(
                'bet_id', bet_id,
                'winnings', winnings_amount,
                'type', 'bet_won'
            );
        WHEN 'lost' THEN
            notification_title := '❌ Bet Lost';
            notification_message := 'Your bet has been lost. Better luck next time!';
            notification_data := jsonb_build_object(
                'bet_id', bet_id,
                'type', 'bet_lost'
            );
        ELSE
            notification_title := '📊 Bet Resolved';
            notification_message := 'Your bet has been resolved.';
            notification_data := jsonb_build_object(
                'bet_id', bet_id,
                'type', 'bet_resolved'
            );
    END CASE;

    -- Insert the notification
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data
    ) VALUES (
        user_uuid,
        CASE bet_status
            WHEN 'won' THEN 'bet_won'
            WHEN 'lost' THEN 'bet_lost'
            ELSE 'bet_resolved'
        END,
        notification_title,
        notification_message,
        notification_data
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_bet_notification(UUID, UUID, TEXT, INTEGER) TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE public.notifications IS 'User notifications for bet resolutions and other events';
COMMENT ON FUNCTION create_bet_notification(UUID, UUID, TEXT, INTEGER) IS 'Creates a notification for a user when their bet is resolved';
