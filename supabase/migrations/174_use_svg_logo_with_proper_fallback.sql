-- Use SVG logo with proper fallback system (image OR text, not both)
-- This creates a clean fallback system where either the SVG loads or text shows

-- Update English 2FA template to use SVG with proper fallback
UPDATE email_templates 
SET html_content = REPLACE(
    html_content,
    '<div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
    </div>',
    '<div style="width: 145px; height: 32px; margin: 0 auto; text-align: center;">
        <!-- SVG Logo with text fallback -->
        <div style="width: 145px; height: 32px; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
        </div>
    </div>'
)
WHERE type = '2fa' AND language = 'en';

-- Update Greek 2FA template to use SVG with proper fallback
UPDATE email_templates 
SET html_content = REPLACE(
    html_content,
    '<div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
    </div>',
    '<div style="width: 145px; height: 32px; margin: 0 auto; text-align: center;">
        <!-- SVG Logo with text fallback -->
        <div style="width: 145px; height: 32px; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
        </div>
    </div>'
)
WHERE type = '2fa' AND language = 'el';

-- Update template variables description
UPDATE email_template_variables 
SET description = 'Logo display method - uses styled text fallback (no external images)'
WHERE variable_name = 'logo_url' AND template_id IN (
    SELECT id
    FROM email_templates
    WHERE type = '2fa'
);
