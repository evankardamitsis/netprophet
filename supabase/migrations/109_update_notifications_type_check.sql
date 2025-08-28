-- Update notifications table to allow 'match_cancelled' notification type
-- Drop the existing check constraint and recreate it with the new type

-- Drop the existing check constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the new check constraint with 'match_cancelled' type
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('bet_won', 'bet_lost', 'bet_resolved', 'match_result', 'match_cancelled', 'system'));
