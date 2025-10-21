-- Create two_factor_codes table for storing verification codes
CREATE TABLE
IF NOT EXISTS two_factor_codes
(
  id UUID DEFAULT gen_random_uuid
() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users
(id) ON
DELETE CASCADE,
  code VARCHAR(6)
NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW
()
);

-- Add two_factor_enabled column to profiles table
ALTER TABLE profiles 
ADD COLUMN
IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX
IF NOT EXISTS idx_two_factor_codes_user_id ON two_factor_codes
(user_id);
CREATE INDEX
IF NOT EXISTS idx_two_factor_codes_code ON two_factor_codes
(code);
CREATE INDEX
IF NOT EXISTS idx_two_factor_codes_expires_at ON two_factor_codes
(expires_at);

-- Enable RLS
ALTER TABLE two_factor_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only access their own 2FA codes
CREATE POLICY "Users can view their own 2FA codes" ON two_factor_codes
  FOR
SELECT USING (auth.uid() = user_id);

-- Users can insert their own 2FA codes
CREATE POLICY "Users can create their own 2FA codes" ON two_factor_codes
  FOR
INSERT WITH CHECK (auth.uid() =
user_id);

-- Users can update their own 2FA codes (for marking as used)
CREATE POLICY "Users can update their own 2FA codes" ON two_factor_codes
  FOR
UPDATE USING (auth.uid()
= user_id);

-- Service role can access all codes (for cleanup and admin operations)
CREATE POLICY "Service role can access all 2FA codes" ON two_factor_codes
  FOR ALL USING
(auth.role
() = 'service_role');

-- Function to automatically clean up expired codes
CREATE OR REPLACE FUNCTION cleanup_expired_two_factor_codes
()
RETURNS void AS $$
BEGIN
    DELETE FROM two_factor_codes 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean up expired codes every hour
-- Note: This requires pg_cron extension to be enabled
-- SELECT cron.schedule('cleanup-2fa-codes', '0 * * * *', 'SELECT cleanup_expired_two_factor_codes();');
