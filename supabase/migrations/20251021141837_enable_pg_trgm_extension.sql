-- Enable pg_trgm extension for similarity function
CREATE EXTENSION
IF NOT EXISTS pg_trgm;

-- Fix any existing functions that use similarity() with wrong return type
-- The similarity() function returns double precision, not real
-- If there are any functions expecting real, we need to cast the result
