-- Create table for dynamic content/copies that can be managed from admin panel
-- This allows admins to change app content without code deployments

-- Drop existing table if it exists (to fix the unique constraint issue)
DROP TABLE IF EXISTS public.dynamic_content CASCADE;

CREATE TABLE public.dynamic_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL, -- e.g., 'info_bar_message', 'welcome_message'
    component TEXT NOT NULL, -- e.g., 'InfoBar', 'HomePage'
    language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'el')),
    content TEXT NOT NULL, -- The actual content/copy
    description TEXT, -- Description of what this content is used for
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique key per language (same key can exist for different languages)
    CONSTRAINT unique_key_language UNIQUE (key, language)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_dynamic_content_key ON public.dynamic_content(key);
CREATE INDEX IF NOT EXISTS idx_dynamic_content_component ON public.dynamic_content(component);
CREATE INDEX IF NOT EXISTS idx_dynamic_content_language ON public.dynamic_content(language);
CREATE INDEX IF NOT EXISTS idx_dynamic_content_active ON public.dynamic_content(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.dynamic_content ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can do everything
CREATE POLICY "Admins can manage dynamic content" ON public.dynamic_content
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- RLS Policy: Authenticated users can view active content
CREATE POLICY "Authenticated users can view active dynamic content" ON public.dynamic_content
    FOR SELECT USING (
        is_active = true
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dynamic_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_dynamic_content_timestamp
    BEFORE UPDATE ON public.dynamic_content
    FOR EACH ROW
    EXECUTE FUNCTION update_dynamic_content_updated_at();

-- Insert default InfoBar messages (only if they don't exist)
INSERT INTO public.dynamic_content (key, component, language, content, description)
SELECT * FROM (VALUES 
    ('info_bar_message', 'InfoBar', 'en', 'Welcome to NetProphet! 🎾', 'Info bar message displayed at the top of the web app'),
    ('info_bar_message', 'InfoBar', 'el', 'Καλώς ήρθατε στο NetProphet! 🎾', 'Info bar message displayed at the top of the web app')
) AS v(key, component, language, content, description)
WHERE NOT EXISTS (
    SELECT 1 FROM public.dynamic_content 
    WHERE dynamic_content.key = v.key AND dynamic_content.language = v.language
);

COMMENT ON TABLE public.dynamic_content IS 'Stores dynamic content/copies that can be managed from the admin panel';
COMMENT ON COLUMN public.dynamic_content.key IS 'Unique identifier for the content (e.g., info_bar_message)';
COMMENT ON COLUMN public.dynamic_content.component IS 'Component name where this content is used (e.g., InfoBar)';
COMMENT ON COLUMN public.dynamic_content.language IS 'Language code (en or el)';
COMMENT ON COLUMN public.dynamic_content.content IS 'The actual content/copy text';
