-- Update welcome email template with latest changes
-- This migration updates the welcome_email template in the database

-- First, delete the existing template
DELETE FROM email_templates 
WHERE type = 'welcome_email' AND language = 'en';

-- Insert the updated template
INSERT INTO email_templates
    (
    type,
    language,
    name,
    subject,
    html_content,
    text_content,
    variables,
    is_active,
    version
    )
VALUES
    (
        'welcome_email',
        'en',
        'Welcome Email',
        'Welcome to NetProphet - Your 100 Coins + Tournament Pass Await!',
        '<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Welcome to NetProphet!</title>
    <style>
      body {
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu,
          Cantarell, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #f8fafc;
      }
      .container {
        background: linear-gradient(
          135deg,
          #1e293b 0%,
          #334155 50%,
          #475569 100%
        );
        border-radius: 16px;
        padding: 40px;
        box-shadow:
          0 20px 25px -5px rgba(0, 0, 0, 0.1),
          0 10px 10px -5px rgba(0, 0, 0, 0.04);
      }
      .header {
        text-align: center;
        margin-bottom: 40px;
      }
      .logo {
        font-size: 32px;
        font-weight: bold;
        color: #60a5fa;
        margin-bottom: 10px;
      }
      .title {
        font-size: 28px;
        font-weight: bold;
        color: white;
        margin-bottom: 16px;
      }
      .subtitle {
        font-size: 18px;
        color: #cbd5e1;
        margin-bottom: 30px;
      }
      .welcome-section {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 30px;
        margin-bottom: 30px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      .welcome-text {
        font-size: 16px;
        color: #e2e8f0;
        margin-bottom: 20px;
      }
      .bonus-section {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border-radius: 12px;
        padding: 25px;
        margin-bottom: 30px;
        text-align: center;
      }
      .bonus-title {
        font-size: 24px;
        font-weight: bold;
        color: white;
        margin-bottom: 15px;
      }
      .bonus-items {
        display: flex;
        justify-content: space-around;
        margin-bottom: 20px;
      }
      .bonus-item {
        text-align: center;
      }
      .bonus-amount {
        font-size: 32px;
        font-weight: bold;
        color: white;
        margin-bottom: 5px;
      }
      .bonus-label {
        font-size: 14px;
        color: #d1fae5;
      }
      .cta-button {
        display: inline-block;
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
        padding: 15px 30px;
        border-radius: 8px;
        text-decoration: none;
        font-weight: bold;
        font-size: 16px;
        transition: transform 0.2s;
      }
      .cta-button:hover {
        transform: translateY(-2px);
      }
      .features-section {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 25px;
        margin-bottom: 30px;
      }
      .features-title {
        font-size: 20px;
        font-weight: bold;
        color: white;
        margin-bottom: 20px;
        text-align: center;
      }
      .features-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
      }
      .feature-item {
        display: flex;
        align-items: center;
        color: #e2e8f0;
        font-size: 14px;
      }
      .feature-icon {
        font-size: 20px;
        margin-right: 10px;
      }
      .footer {
        text-align: center;
        color: #94a3b8;
        font-size: 14px;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      .footer a {
        color: #60a5fa;
        text-decoration: none;
      }
      @media (max-width: 600px) {
        .bonus-items {
          flex-direction: column;
          gap: 15px;
        }
        .features-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">NetProphet</div>
        <h1 class="title">Welcome to NetProphet!</h1>
        <p class="subtitle">The most advanced tennis prediction platform</p>
      </div>

      <div class="welcome-section">
        <p class="welcome-text">
          Hi <strong>{{user_name}}</strong>! 🎉<br /><br />
          Welcome to NetProphet - the ultimate platform for tennis prediction
          enthusiasts! You''re about to embark on an exciting journey where you
          can predict real amateur tennis matches, earn coins, and climb the
          leaderboard.
        </p>
      </div>

      <div class="bonus-section">
        <h2 class="bonus-title">🎁 Your Welcome Bonus!</h2>
        <div class="bonus-items">
          <div class="bonus-item">
            <div class="bonus-amount">100 🌕</div>
            <div class="bonus-label">Welcome Coins</div>
          </div>
          <div class="bonus-item">
            <div class="bonus-amount">🎫</div>
            <div class="bonus-label">Tournament Pass</div>
          </div>
        </div>
        <a href="{{app_url}}" class="cta-button">Claim Your Bonus Now!</a>
      </div>

      <div class="features-section">
        <h3 class="features-title">🚀 What Makes NetProphet Special</h3>
        <div class="features-grid">
          <div class="feature-item">
            <span class="feature-icon">🎾</span>
            <span>Real Amateur Matches</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">📊</span>
            <span>Detailed Player Stats</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">⚡</span>
            <span>Power-ups & Bonuses</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🏆</span>
            <span>Tournament Leaderboards</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🔍</span>
            <span>1000+ Players Database</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">📈</span>
            <span>Live Match Results</span>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>
          Ready to become the next Net Prophet?
          <a href="{{app_url}}">Start predicting now!</a>
        </p>
        <p style="margin-top: 15px; font-size: 12px">
          This email was sent to {{user_email}} because you registered on
          NetProphet.<br />
          If you have any questions, feel free to contact our support team.
        </p>
      </div>
    </div>
  </body>
</html>',
        'Welcome to NetProphet!

Hi {{user_name}}! 🎉

Welcome to NetProphet - the ultimate platform for tennis prediction enthusiasts! You''re about to embark on an exciting journey where you can predict real amateur tennis matches, earn coins, and climb the leaderboard.

🎁 Your Welcome Bonus!
• 100 🌕 Welcome Coins
• 🎫 Tournament Pass

Claim your bonus now: {{app_url}}

🚀 What Makes NetProphet Special:
• 🎾 Real Amateur Matches
• 📊 Detailed Player Stats  
• ⚡ Power-ups & Bonuses
• 🏆 Tournament Leaderboards
• 🔍 1000+ Players Database
• 📈 Live Match Results

Ready to become the next Net Prophet? Start predicting now: {{app_url}}

This email was sent to {{user_email}} because you registered on NetProphet.
If you have any questions, feel free to contact our support team.',
        '{
     "app_url": "https://netprophetapp.com",
     "user_name": "New User",
     "user_email": "user@example.com",
     "welcome_bonus_coins": 100,
     "welcome_bonus_pass": "Tournament Pass"
   }',
        true,
        2
);

-- Grant permissions for the updated template
GRANT SELECT ON email_templates TO authenticated;
GRANT SELECT ON email_templates TO anon;
