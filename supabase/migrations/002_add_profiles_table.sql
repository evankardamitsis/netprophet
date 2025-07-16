-- Create profiles table
CREATE TABLE profiles
(
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    username TEXT,
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
    WITH TIME ZONE DEFAULT NOW
    (),
    updated_at TIMESTAMP
    WITH TIME ZONE DEFAULT NOW
    ()
);

    -- Enable Row Level Security on profiles
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

    -- RLS Policies for profiles
    CREATE POLICY "Users can view their own profile" ON profiles
    FOR
    SELECT USING (auth.uid() = id);

    CREATE POLICY "Users can update their own profile" ON profiles
    FOR
    UPDATE USING (auth.uid()
    = id);

    CREATE POLICY "Admins can view all profiles" ON profiles
    FOR
    SELECT USING (
        EXISTS (
            SELECT 1
        FROM profiles
        WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

    CREATE POLICY "Admins can update all profiles" ON profiles
    FOR
    UPDATE USING (
        EXISTS (
            SELECT 1
    FROM profiles
    WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

    -- Create trigger to automatically create profile when user signs up
    CREATE OR REPLACE FUNCTION public.handle_new_user
    ()
RETURNS TRIGGER AS $$
    BEGIN
        INSERT INTO public.profiles
            (id, email, username, avatar_url)
        VALUES
            (
                NEW.id,
                NEW.email,
                COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
                NEW.raw_user_meta_data->>'avatar_url'
    );
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Create trigger
    CREATE TRIGGER on_auth_user_created
    AFTER
    INSERT ON
    auth.users
    FOR EACH ROW
    EXECUTE
    FUNCTION public.handle_new_user
    ();

    -- Create index for better performance
    CREATE INDEX idx_profiles_email ON profiles(email);
    CREATE INDEX idx_profiles_is_admin ON profiles(is_admin);

    -- Insert the first super admin (replace with your actual user ID)
    -- First, let's create a function to set the first admin
    CREATE OR REPLACE FUNCTION set_first_admin
    (admin_email TEXT)
RETURNS VOID AS $$
    BEGIN
        -- Update the profile to make them admin
        UPDATE profiles 
    SET is_admin = TRUE 
    WHERE email = admin_email;

        -- If no rows were updated, the user might not exist yet
        IF NOT FOUND THEN
        RAISE NOTICE 'User with email % not found. They will be made admin when they first sign in.', admin_email;
    ELSE
        RAISE NOTICE 'Successfully set % as admin', admin_email;
    END
    IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Call the function to set your email as admin
    SELECT set_first_admin('kardamitsis.e@gmail.com'); 