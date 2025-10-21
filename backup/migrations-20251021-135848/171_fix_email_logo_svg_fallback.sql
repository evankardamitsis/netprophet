-- Fix email template logo loading by using SVG with text fallback
-- This ensures logos always display even if images are blocked

-- Update English 2FA template with SVG logo and text fallback
UPDATE email_templates 
SET html_content = REPLACE(
    html_content,
    '<img src="{{logo_url}}" alt="NetProphet Logo" style="width: 145px; height: 32px; display: block; margin: 0 auto;" />',
    '<div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
    </div>'
)
WHERE type = '2fa' AND language = 'en';

-- Update Greek 2FA template with SVG logo and text fallback
UPDATE email_templates 
SET html_content = REPLACE(
    html_content,
    '<img src="{{logo_url}}" alt="NetProphet Logo" style="width: 145px; height: 32px; display: block; margin: 0 auto;" />',
    '<div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
    </div>'
)
WHERE type = '2fa' AND language = 'el';

-- Update template variables description
UPDATE email_template_variables 
SET description = 'Logo display method - now uses styled text fallback instead of external images'
WHERE variable_name = 'logo_url' AND template_id IN (
    SELECT id
    FROM email_templates
    WHERE type = '2fa'
);
