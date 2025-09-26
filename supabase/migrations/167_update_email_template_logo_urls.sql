-- Update logo URLs in existing email templates
UPDATE email_templates 
SET variables = jsonb_set(
    variables, 
    '{logo_url}', 
    '"https://netprophet.vercel.app/net-prophet-logo-with-icon.png"'
)
WHERE type = '2fa' AND variables
? 'logo_url';

-- Update template variables for logo_url
UPDATE email_template_variables 
SET default_value = 'https://netprophet.vercel.app/net-prophet-logo-with-icon.png'
WHERE variable_name = 'logo_url' AND template_id IN (
    SELECT id
    FROM email_templates
    WHERE type = '2fa'
);
