-- Migration: Add automatic profile creation trigger for OAuth signup
-- This fixes the CORS issue where Google OAuth users couldn't register due to missing profiles

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user
()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles
        (id, email, created_at, updated_at)
    VALUES
        (
            NEW.id,
            NEW.email,
            NEW.created_at,
            NEW.updated_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile when new user signs up
CREATE TRIGGER on_auth_user_created
    AFTER
INSERT ON
auth.users
FOR EACH ROW
EXECUTE
FUNCTION public.handle_new_user
();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user
() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user
() TO anon;

-- Add policy to allow the trigger function to insert profiles
-- This is needed because the trigger runs with SECURITY DEFINER
CREATE POLICY "Allow trigger function to insert profiles" ON profiles
    FOR
INSERT WITH CHECK
    (true)
;
