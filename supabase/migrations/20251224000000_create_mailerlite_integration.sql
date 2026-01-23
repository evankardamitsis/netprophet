-- MailerLite Integration Migration
-- Creates table for tracking MailerLite subscriptions and adds function to subscribe users
-- Handles existing table by ensuring proper RLS and policies

-- 1. Create mailerlite_logs table to track subscription attempts (if not exists)
CREATE TABLE IF NOT EXISTS public.mailerlite_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    mailerlite_id TEXT, -- MailerLite subscriber ID
    error_message TEXT,
    groups TEXT[], -- Array of group IDs/names
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns if they don't exist (for existing tables)
DO $$
BEGIN
    -- Add user_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mailerlite_logs' 
        AND column_name = 'user_id'
    ) THEN
        -- Add as nullable first (no foreign key constraint - add separately if needed)
        ALTER TABLE public.mailerlite_logs ADD COLUMN user_id UUID;
    END IF;
END $$;

-- Add foreign key constraint if column exists but constraint doesn't
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mailerlite_logs' 
        AND column_name = 'user_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'mailerlite_logs' 
        AND constraint_name = 'mailerlite_logs_user_id_fkey'
    ) THEN
        -- Try to add foreign key (may fail if invalid data exists, but that's ok)
        ALTER TABLE public.mailerlite_logs 
            ADD CONSTRAINT mailerlite_logs_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- If foreign key fails, just continue - column exists but no constraint
        RAISE NOTICE 'Could not add foreign key constraint for user_id: %', SQLERRM;
END $$;

-- Continue adding other missing columns
DO $$
BEGIN
    
    -- Add name column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mailerlite_logs' 
        AND column_name = 'name'
    ) THEN
        ALTER TABLE public.mailerlite_logs ADD COLUMN name TEXT;
    END IF;
    
    -- Add status column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mailerlite_logs' 
        AND column_name = 'status'
    ) THEN
        -- Add as nullable first, set default, then make NOT NULL
        ALTER TABLE public.mailerlite_logs ADD COLUMN status TEXT;
        UPDATE public.mailerlite_logs SET status = 'pending' WHERE status IS NULL;
        ALTER TABLE public.mailerlite_logs ALTER COLUMN status SET DEFAULT 'pending';
        ALTER TABLE public.mailerlite_logs ALTER COLUMN status SET NOT NULL;
    END IF;
    
    -- Add check constraint if status column exists but constraint doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mailerlite_logs' 
        AND column_name = 'status'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'mailerlite_logs' 
        AND constraint_name = 'mailerlite_logs_status_check'
    ) THEN
        ALTER TABLE public.mailerlite_logs ADD CONSTRAINT mailerlite_logs_status_check 
            CHECK (status IN ('pending', 'success', 'failed'));
    END IF;
    
    -- Add mailerlite_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mailerlite_logs' 
        AND column_name = 'mailerlite_id'
    ) THEN
        ALTER TABLE public.mailerlite_logs ADD COLUMN mailerlite_id TEXT;
    END IF;
    
    -- Add error_message column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mailerlite_logs' 
        AND column_name = 'error_message'
    ) THEN
        ALTER TABLE public.mailerlite_logs ADD COLUMN error_message TEXT;
    END IF;
    
    -- Add groups column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mailerlite_logs' 
        AND column_name = 'groups'
    ) THEN
        ALTER TABLE public.mailerlite_logs ADD COLUMN groups TEXT[];
    END IF;
    
    -- Add created_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mailerlite_logs' 
        AND column_name = 'created_at'
    ) THEN
        -- Add as nullable first, set default, then make NOT NULL
        ALTER TABLE public.mailerlite_logs ADD COLUMN created_at TIMESTAMPTZ;
        UPDATE public.mailerlite_logs SET created_at = NOW() WHERE created_at IS NULL;
        ALTER TABLE public.mailerlite_logs ALTER COLUMN created_at SET DEFAULT NOW();
        ALTER TABLE public.mailerlite_logs ALTER COLUMN created_at SET NOT NULL;
    END IF;
    
    -- Add processed_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mailerlite_logs' 
        AND column_name = 'processed_at'
    ) THEN
        ALTER TABLE public.mailerlite_logs ADD COLUMN processed_at TIMESTAMPTZ;
    END IF;
    
    -- Add updated_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mailerlite_logs' 
        AND column_name = 'updated_at'
    ) THEN
        -- Add as nullable first, set default, then make NOT NULL
        ALTER TABLE public.mailerlite_logs ADD COLUMN updated_at TIMESTAMPTZ;
        UPDATE public.mailerlite_logs SET updated_at = NOW() WHERE updated_at IS NULL;
        ALTER TABLE public.mailerlite_logs ALTER COLUMN updated_at SET DEFAULT NOW();
        ALTER TABLE public.mailerlite_logs ALTER COLUMN updated_at SET NOT NULL;
    END IF;
END $$;

-- Create unique constraint on email to prevent duplicates (only for pending/success)
-- This allows retrying failed entries
DROP INDEX IF EXISTS idx_mailerlite_logs_email_unique;
CREATE UNIQUE INDEX idx_mailerlite_logs_email_unique 
ON public.mailerlite_logs(email) 
WHERE status IN ('pending', 'success');

-- Create indexes for efficient querying (only if columns exist)
DO $$
BEGIN
    -- Create status index if status column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mailerlite_logs' 
        AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_mailerlite_logs_status ON public.mailerlite_logs(status);
    END IF;
    
    -- Create user_id index if user_id column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mailerlite_logs' 
        AND column_name = 'user_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_mailerlite_logs_user_id ON public.mailerlite_logs(user_id);
    END IF;
    
    -- Create email index if email column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mailerlite_logs' 
        AND column_name = 'email'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_mailerlite_logs_email ON public.mailerlite_logs(email);
    END IF;
END $$;

-- Enable RLS (idempotent - won't fail if already enabled)
ALTER TABLE public.mailerlite_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then create new one
DROP POLICY IF EXISTS "Service role can manage mailerlite_logs" ON public.mailerlite_logs;
CREATE POLICY "Service role can manage mailerlite_logs"
    ON public.mailerlite_logs
    FOR ALL
    USING (auth.role() = 'service_role');

-- 2. Create function to add user to MailerLite (non-blocking)
CREATE OR REPLACE FUNCTION public.add_user_to_mailerlite(
    p_user_id UUID,
    p_email TEXT,
    p_name TEXT DEFAULT NULL,
    p_groups TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS void AS $$
BEGIN
    -- Insert into mailerlite_logs for async processing
    -- The mailerlite-process-queue Edge Function will process these
    INSERT INTO public.mailerlite_logs (
        user_id,
        email,
        name,
        status,
        groups,
        created_at,
        updated_at
    )
    VALUES (
        p_user_id,
        p_email,
        p_name,
        'pending',
        CASE WHEN array_length(p_groups, 1) > 0 THEN p_groups ELSE NULL END,
        NOW(),
        NOW()
    )
    ON CONFLICT (email) WHERE status IN ('pending', 'success') DO NOTHING; -- Prevent duplicates
    
    RAISE LOG '[add_user_to_mailerlite] Queued user % for MailerLite subscription', p_email;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail - MailerLite is non-critical
        RAISE LOG '[add_user_to_mailerlite] Error queuing user %: %', p_email, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.add_user_to_mailerlite(UUID, TEXT, TEXT, TEXT[]) TO service_role;

COMMENT ON FUNCTION public.add_user_to_mailerlite(UUID, TEXT, TEXT, TEXT[]) IS 
'Queues a user for MailerLite subscription. Non-blocking - failures do not affect user registration. Processed by mailerlite-process-queue Edge Function.';

-- 3. Update handle_new_user to automatically add users to MailerLite
-- This will be done by modifying the existing function
