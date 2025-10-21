-- Fix the trigger and function setup for user registration
-- This migration ensures we have the correct trigger calling the correct function

-- 1. Drop all existing triggers on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Ensure we have the correct handle_new_user function
-- (This should already exist from migration 197, but let's make sure it's correct)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_first_name TEXT;
    user_last_name TEXT;
BEGIN
    -- Extract firstName and lastName from user metadata
    user_first_name := COALESCE(NEW.raw_user_meta_data->>'firstName', '');
    user_last_name := COALESCE(NEW.raw_user_meta_data->>'lastName', '');
    
    -- Insert profile with correct column names
    INSERT INTO public.profiles
        (
            id, 
            email, 
            firstName, 
            lastName, 
            balance, 
            daily_login_streak, 
            has_received_welcome_bonus,
            created_at, 
            updated_at
        )
    VALUES
        (
            NEW.id,
            NEW.email,
            user_first_name,
            user_last_name,
            0, -- balance starts at 0
            0, -- daily_login_streak starts at 0
            false, -- has_received_welcome_bonus starts false
            NEW.created_at,
            NEW.updated_at
        );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE LOG 'Error in handle_new_user for user %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the correct trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- 5. Ensure RLS policy allows the trigger to insert profiles
DROP POLICY IF EXISTS "Allow trigger function to insert profiles" ON profiles;
CREATE POLICY "Allow trigger function to insert profiles" ON profiles
    FOR INSERT WITH CHECK (true);

-- Add comment to document this change
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile for new users with correct column names and proper trigger setup';
