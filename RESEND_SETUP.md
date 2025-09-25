# Resend Email Setup Guide

## 🚀 Quick Setup

### 1. Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get API Key

1. Navigate to **API Keys** in your Resend dashboard
2. Click **Create API Key**
3. Name it "NetProphet Production"
4. Copy the API key (starts with `re_`)

### 3. Add Domain (Production)

1. Go to **Domains** in your Resend dashboard
2. Click **Add Domain**
3. Enter `netprophet.app` (or your production domain)
4. Follow DNS verification steps:
   - Add TXT record for domain verification
   - Add MX record for email routing
   - Add SPF record for sender authentication

### 4. Configure Environment Variables

Add to your production environment:

```bash
RESEND_API_KEY=re_your_api_key_here
```

### 5. Deploy Edge Function

```bash
# Deploy the updated email function
supabase functions deploy send-email

# Apply database migration
supabase db push

# Apply config changes
supabase start
```

## 📧 Email Templates

The system includes these email templates:

### 🔐 2FA Verification

- **Template**: `2fa_code`
- **Languages**: English, Greek
- **Purpose**: Send OTP codes for two-factor authentication

### 🎉 Winnings Notifications

- **Template**: `winnings_notification`
- **Languages**: English, Greek
- **Purpose**: Notify users when they win predictions

### 📢 Promotional Updates

- **Template**: `promotional_update`
- **Languages**: English, Greek
- **Purpose**: Send featured matches and special offers

### 🚨 Admin Alerts

- **Template**: `admin_alert`
- **Languages**: English, Greek
- **Purpose**: Critical system notifications

## 🔧 Usage Examples

### Send 2FA Email

```typescript
const { send2FAEmail } = useEmail();
await send2FAEmail("user@example.com", "123456", "el");
```

### Send Winnings Email

```typescript
const { sendWinningsEmail } = useEmail();
await sendWinningsEmail(
  "user@example.com",
  "Djokovic vs Nadal",
  "Djokovic",
  150,
  "en"
);
```

### Send Promotional Email

```typescript
const { sendPromotionalEmail } = useEmail();
await sendPromotionalEmail("user@example.com", featuredMatches, "el");
```

### Send Admin Alert

```typescript
const { sendAdminAlert } = useEmail();
await sendAdminAlert("Security Alert", "Multiple failed login attempts", {
  ip: "192.168.1.1",
});
```

## 🛡️ Fallback System

The email system includes automatic fallback:

1. **Primary**: Resend API
2. **Fallback**: SendGrid API (if configured)
3. **Logging**: All emails are logged in the database

## 📊 Monitoring

### Email Logs

View email logs in the admin dashboard:

- Total emails sent
- Success/failure rates
- Email types and languages
- Recent activity

### Resend Dashboard

Monitor in Resend dashboard:

- Delivery rates
- Bounce rates
- Open rates (if tracking enabled)
- API usage

## 🔒 Security Features

- **Rate Limiting**: Built-in protection against spam
- **Domain Verification**: Ensures legitimate sender
- **Template Validation**: Prevents injection attacks
- **Audit Trail**: Complete email logging

## 🚀 Production Benefits

### Resend Advantages:

- **Modern API**: Clean, RESTful interface
- **Great Deliverability**: High inbox placement rates
- **Developer Friendly**: Easy integration and debugging
- **Cost Effective**: Generous free tier (3,000 emails/month)
- **Fast Setup**: No complex configuration required

### Features:

- ✅ **Instant Delivery**: Real-time email sending
- ✅ **Template System**: Dynamic content with variables
- ✅ **Multilingual**: Greek and English support
- ✅ **Admin Dashboard**: Complete email management
- ✅ **Fallback System**: Automatic failover to SendGrid
- ✅ **Audit Trail**: Full email logging and tracking

## 🆘 Troubleshooting

### Common Issues:

1. **"RESEND_API_KEY not found"**
   - Check environment variables
   - Ensure key is properly set in production

2. **"Domain not verified"**
   - Complete DNS verification in Resend dashboard
   - Wait for DNS propagation (up to 24 hours)

3. **"Template not found"**
   - Check template name in email service calls
   - Ensure template exists in Edge Function

4. **Emails not delivered**
   - Check spam folder
   - Verify domain reputation
   - Review Resend dashboard for delivery status

### Support:

- **Resend Docs**: [resend.com/docs](https://resend.com/docs)
- **Supabase Functions**: [supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)

## 📈 Next Steps

1. **Set up Resend account** and get API key
2. **Add domain verification** for production
3. **Deploy Edge Function** with Resend integration
4. **Test email system** with all templates
5. **Monitor delivery rates** in Resend dashboard
6. **Set up email tracking** (optional)

Your email system is now ready for production with Resend! 🎉
