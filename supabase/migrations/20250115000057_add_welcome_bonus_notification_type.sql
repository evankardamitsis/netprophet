-- Add 'welcome_bonus' to the notifications type check constraint
-- This allows welcome bonus notifications to be created

-- Drop the existing check constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the new check constraint with 'welcome_bonus' type
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('bet_won', 'bet_lost', 'bet_resolved', 'match_result', 'match_cancelled', 'system', 'welcome_bonus'));

-- Add comment to document the new type
COMMENT ON CONSTRAINT notifications_type_check ON public.notifications IS 'Validates notification types including welcome_bonus for welcome bonus notifications';
