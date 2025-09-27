-- Simplify admin_alert email template to remove complex details section
-- Make it cleaner and more professional

UPDATE email_templates 
SET 
    html_content = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Alert - NetProphet</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="margin-bottom: 20px;">
        <div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
        </div>
      </div>
      <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 16px;">Admin Alert System</p>
    </div>

    <!-- Main Content -->
    <div style="background: rgba(30, 41, 59, 0.8); backdrop-filter: blur(10px); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 16px; padding: 40px; color: white; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
      
      <!-- Alert Header -->
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
          <span style="font-size: 24px;">🚨</span>
        </div>
        <h1 style="color: #fca5a5; font-size: 24px; font-weight: bold; margin: 0 0 8px 0;">Admin Alert</h1>
        <p style="color: #94a3b8; font-size: 16px; margin: 0;">{{alert_type}}</p>
      </div>

      <!-- Alert Message -->
      <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 24px; margin-bottom: 32px;">
        <h2 style="color: #fca5a5; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">Alert Details</h2>
        <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0;">{{message}}</p>
      </div>

      <!-- Timestamp -->
      <div style="text-align: center; margin-bottom: 32px;">
        <p style="color: #64748b; font-size: 14px; margin: 0;">
          Alert triggered at: {{timestamp}}
        </p>
      </div>

      <!-- Action Required -->
      <div style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 12px; padding: 24px; text-align: center;">
        <h3 style="color: #fbbf24; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">Action Required</h3>
        <p style="color: #fde68a; font-size: 14px; margin: 0;">Please review this alert and take appropriate action if necessary.</p>
      </div>

    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 40px;">
      <p style="color: #64748b; font-size: 12px; margin: 0 0 8px 0;">
        This is an automated admin alert from NetProphet
      </p>
      <p style="color: #64748b; font-size: 12px; margin: 0;">
        NetProphet Admin System
      </p>
    </div>
  </div>
</body>
</html>',
    text_content = 'ADMIN ALERT: {{alert_type}}

{{message}}

Alert triggered at: {{timestamp}}

This is an automated admin alert from NetProphet.
Please review and take appropriate action if necessary.

NetProphet Admin System'
WHERE type = 'admin_alert' AND language = 'en';

-- Add comment for documentation
COMMENT ON TABLE email_templates IS 'Email templates for the NetProphet application - admin_alert template simplified to remove complex details section';
