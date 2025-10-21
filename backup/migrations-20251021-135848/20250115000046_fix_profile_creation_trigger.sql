-- Fix profile creation trigger to explicitly set balance to 0
-- This ensures new users always start with 0 balance

-- Update the handle_new_user function to explicitly set balance to 0
CREATE OR REPLACE FUNCTION public.handle_new_user
()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles
        (id, email, balance, daily_login_streak, has_received_welcome_bonus, created_at, updated_at)
    VALUES
        (
            NEW.id,
            NEW.email,
            0, -- Explicitly set balance to 0
            0, -- Set daily login streak to 0
            false, -- Set welcome bonus flag to false
            NEW.created_at,
            NEW.updated_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
