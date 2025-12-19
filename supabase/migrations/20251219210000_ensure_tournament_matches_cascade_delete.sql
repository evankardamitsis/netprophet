-- Ensure tournament deletion cascades to matches
-- When a tournament is deleted, all its matches should be automatically deleted

-- Drop any existing foreign key constraint on tournament_id (if it exists without CASCADE)
DO $
$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Find all foreign key constraints on matches.tournament_id
    FOR constraint_record IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
    WHERE tc.table_name = 'matches'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'tournament_id'
        AND tc.table_schema = 'public'
    LOOP
    EXECUTE format
    ('ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS %I', constraint_record.constraint_name);
END
LOOP;
END $$;

-- Add the foreign key constraint with ON DELETE CASCADE
-- This ensures that when a tournament is deleted, all its matches are automatically deleted
ALTER TABLE public.matches
ADD CONSTRAINT matches_tournament_id_fkey
FOREIGN KEY (tournament_id)
REFERENCES public.tournaments(id)
ON DELETE CASCADE;

COMMENT ON CONSTRAINT matches_tournament_id_fkey ON public.matches IS 
'Foreign key constraint ensuring tournament deletion cascades to all associated matches';
