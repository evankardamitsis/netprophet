-- Enable 2FA for all new users by default
-- This migration updates the profile creation trigger to automatically enable 2FA

-- Update the handle_new_user function to enable 2FA by default
CREATE OR REPLACE FUNCTION public.handle_new_user
()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles
        (id, email, balance, daily_login_streak, has_received_welcome_bonus, two_factor_enabled, created_at, updated_at)
    VALUES
        (
            NEW.id,
            NEW.email,
            0, -- Explicitly set balance to 0
            0, -- Set daily login streak to 0
            false, -- Set welcome bonus flag to false
            true, -- Enable 2FA by default for all new users
            NEW.created_at,
            NEW.updated_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also enable 2FA for existing users who don't have it enabled yet
UPDATE profiles 
SET two_factor_enabled = true 
WHERE two_factor_enabled IS NULL OR two_factor_enabled = false;

-- Add comment to document this change
COMMENT ON FUNCTION public.handle_new_user
() IS 'Creates profile for new users with 2FA enabled by default';
