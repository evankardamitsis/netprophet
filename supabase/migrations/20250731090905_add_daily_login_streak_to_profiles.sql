-- Add daily_login_streak column to profiles table
ALTER TABLE profiles ADD COLUMN
IF NOT EXISTS daily_login_streak INTEGER DEFAULT 0;

-- Add transactions table if it doesn't exist
CREATE TABLE
IF NOT EXISTS transactions
(
    id UUID DEFAULT gen_random_uuid
() PRIMARY KEY,
    user_id UUID REFERENCES auth.users
(id) ON
DELETE CASCADE NOT NULL,
    type TEXT
NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP
WITH TIME ZONE DEFAULT NOW
()
);

-- Enable RLS on transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR
SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON transactions
    FOR
INSERT WITH CHECK (auth.uid() =
user_id); 