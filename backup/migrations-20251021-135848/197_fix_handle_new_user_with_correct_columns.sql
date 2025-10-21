-- Fix handle_new_user function with correct column names
-- This migration creates a proper handle_new_user function using the correct column names

-- Update the handle_new_user function to use the correct column names
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

-- Add comment to document this change
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile for new users with correct column names';
