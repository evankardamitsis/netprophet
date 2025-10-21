-- Create coin_packs table for admin management
CREATE TABLE IF NOT EXISTS coin_packs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price_euro DECIMAL(10,2) NOT NULL CHECK (price_euro >= 0),
    base_coins INTEGER NOT NULL CHECK (base_coins >= 0),
    bonus_coins INTEGER NOT NULL DEFAULT 0 CHECK (bonus_coins >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_coin_packs_active ON coin_packs(is_active);
CREATE INDEX IF NOT EXISTS idx_coin_packs_price ON coin_packs(price_euro);

-- Enable RLS
ALTER TABLE coin_packs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage coin packs" ON coin_packs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_coin_packs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_coin_packs_updated_at
    BEFORE UPDATE ON coin_packs
    FOR EACH ROW
    EXECUTE FUNCTION update_coin_packs_updated_at();

-- Insert default coin packs
INSERT INTO coin_packs (name, price_euro, base_coins, bonus_coins, is_active) VALUES
    ('Starter Pack', 1.99, 350, 0, true),
    ('Basic Pack', 4.99, 900, 50, true),
    ('Pro Pack', 9.99, 1800, 150, true),
    ('Champion Pack', 19.99, 3600, 300, true),
    ('Legend Pack', 39.99, 7000, 700, true)
ON CONFLICT DO NOTHING;
