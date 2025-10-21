-- Fix multiplier field type to ensure it's DECIMAL(5,2)
-- This migration ensures the multiplier field can accept decimal values like 2.35

-- Alter the multiplier column to DECIMAL(5,2)
ALTER TABLE public.bets ALTER COLUMN multiplier TYPE
DECIMAL
(5,2);
