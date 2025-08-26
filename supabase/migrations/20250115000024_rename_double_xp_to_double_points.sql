-- Rename Double XP Match to Double Points Match
UPDATE power_ups 
SET 
    name = 'Double Points Match',
    effect = 'Double points for 1 chosen match',
    description = 'Double your points earned from a specific match'
WHERE power_up_id = 'doubleXP';
