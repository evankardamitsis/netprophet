-- Fix duplicate logo issue by removing the image and keeping only the SVG text fallback
-- This ensures only one logo appears in emails

-- Update English 2FA template to remove duplicate logo
UPDATE email_templates 
SET html_content = REPLACE(
    html_content,
    '<div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
    </div>
    <!-- Fallback: If images are blocked, show the styled text above -->
    <img src="{{logo_url}}" alt="NetProphet Logo" style="width: 145px; height: 32px; display: block; margin: 0 auto;" />',
    '<div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
    </div>'
)
WHERE type = '2fa' AND language = 'en';

-- Update Greek 2FA template to remove duplicate logo
UPDATE email_templates 
SET html_content = REPLACE(
    html_content,
    '<div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
    </div>
    <!-- Fallback: If images are blocked, show the styled text above -->
    <img src="{{logo_url}}" alt="NetProphet Logo" style="width: 145px; height: 32px; display: block; margin: 0 auto;" />',
    '<div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
    </div>'
)
WHERE type = '2fa' AND language = 'el';

-- Update template variables description to reflect the change
UPDATE email_template_variables 
SET description = 'Logo display method - now uses styled text only (no external images)'
WHERE variable_name = 'logo_url' AND template_id IN (
    SELECT id
    FROM email_templates
    WHERE type = '2fa'
);
