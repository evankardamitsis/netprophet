-- Improve email logo handling with better alt text and fallback
-- This addresses the common issue of email clients blocking external images

-- Update English 2FA template with better logo handling
UPDATE email_templates 
SET html_content = REPLACE(
    html_content,
    '<img src="{{logo_url}}" alt="NetProphet Logo" style="width: 145px; height: 32px; display: block; margin: 0 auto;" />',
    '<div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-weight: bold; font-size: 14px;">NetProphet</span>
    </div>
    <!-- Fallback: If images are blocked, show the styled text above -->
    <img src="{{logo_url}}" alt="NetProphet Logo" style="width: 145px; height: 32px; display: block; margin: 0 auto;" onerror="this.style.display=''none''; this.previousElementSibling.style.display=''flex'';" />'
)
WHERE type = '2fa' AND language = 'en';

-- Update Greek 2FA template with better logo handling  
UPDATE email_templates 
SET html_content = REPLACE(
    html_content,
    '<img src="{{logo_url}}" alt="NetProphet Logo" style="width: 145px; height: 32px; display: block; margin: 0 auto;" />',
    '<div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-weight: bold; font-size: 14px;">NetProphet</span>
    </div>
    <!-- Fallback: If images are blocked, show the styled text above -->
    <img src="{{logo_url}}" alt="NetProphet Logo" style="width: 145px; height: 32px; display: block; margin: 0 auto;" onerror="this.style.display=''none''; this.previousElementSibling.style.display=''flex'';" />'
)
WHERE type = '2fa' AND language = 'el';

-- Update template variables description
UPDATE email_template_variables 
SET description = 'URL to the NetProphet logo image. If blocked by email client, a styled text fallback will be shown.'
WHERE variable_name = 'logo_url' AND template_id IN (
    SELECT id
    FROM email_templates
    WHERE type = '2fa'
);
