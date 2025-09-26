-- 188_remove_indoor_fatigue_fields.sql
-- Remove indoor win rate and fatigue level fields from players table

-- Remove fatigue_level column
ALTER TABLE players DROP COLUMN IF EXISTS fatigue_level;

-- Update surface_win_rates to remove indoor field
-- This will be handled by the application layer, but we can also clean up existing data
UPDATE players 
SET surface_win_rates = surface_win_rates - 'indoor'
WHERE surface_win_rates
? 'indoor';

-- Update surface_preference constraint to remove Indoor option
ALTER TABLE players DROP CONSTRAINT IF EXISTS surface_preference_check;
ALTER TABLE players ADD CONSTRAINT surface_preference_check 
CHECK (surface_preference IN ('Hard Court', 'Clay Court', 'Grass Court'));
