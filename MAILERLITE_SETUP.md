# MailerLite Integration Setup Guide

This guide explains how to set up MailerLite for automated marketing workflows (welcome emails, onboarding sequences, campaigns).

## 🎯 Overview

**Important**: MailerLite is used **only** for marketing automation workflows. Transactional emails (2FA codes, winnings notifications, admin alerts) continue to use Resend and are not affected by this integration.

### Separation of Concerns

- **Resend (Transactional)**: 2FA codes, winnings notifications, admin alerts, system emails
- **MailerLite (Marketing)**: Welcome sequences, onboarding emails, marketing campaigns, newsletters

## 🚀 Setup Steps

### 1. Create MailerLite Account

1. Go to [mailerlite.com](https://www.mailerlite.com)
2. Sign up for an account (free tier available)
3. Verify your email address

### 2. Get API Key

1. Log in to MailerLite dashboard
2. Navigate to **Integrations** → **Developers** → **API**
3. Click **Generate new token**
4. Name it "NetProphet Production"
5. Copy the API token

### 3. Create Subscriber Groups

Create groups in MailerLite for different user segments:

- **Users** (default) - All registered users
- **Active Players** - Users who have made predictions
- **Tournament Participants** - Users in tournaments
- **Premium Users** - Users with premium features

To get group IDs:

1. Go to **Subscribers** → **Groups**
2. Click on a group
3. The group ID is in the URL or group settings

### 4. Configure Environment Variables

Add to your Supabase project environment variables:

```bash
MAILERLITE_API_KEY=ML_your_api_token_here
MAILERLITE_GROUP_ID=123456  # Optional: default group ID
```

To add environment variables in Supabase:

1. Go to **Project Settings** → **Edge Functions**
2. Scroll to **Environment Variables**
3. Add `MAILERLITE_API_KEY` and `MAILERLITE_GROUP_ID`

### 5. Deploy Edge Functions

```bash
# Deploy the MailerLite subscribe function
supabase functions deploy mailerlite-subscribe

# Deploy the queue processor (optional)
supabase functions deploy mailerlite-process-queue

# Or deploy all functions
supabase functions deploy
```

### 6. Update User Registration

The user registration trigger (`handle_new_user`) can be updated to automatically add new users to MailerLite. This is done via the migration or manually.

### 7. Set Up Automated Workflows in MailerLite

#### Welcome Email Sequence

1. Go to **Automations** in MailerLite dashboard
2. Click **Create Automation**
3. Choose **"When subscriber joins group"**
4. Select **"Users"** group
5. Create a welcome email:
   - Subject: "🎾 Welcome to NetProphet!"
   - Content: Personalized welcome message
   - Include: Welcome bonus, getting started guide
6. Activate the workflow

#### Onboarding Sequence

Create a multi-email sequence:

**Day 1**: Welcome + Welcome bonus
**Day 2**: How to make predictions
**Day 3**: Understanding odds
**Day 5**: First match tips
**Day 7**: Join a tournament

To set up:

1. Create automation: **"When subscriber joins group"**
2. Select **"Users"** group
3. Add delay between emails
4. Create email sequence
5. Activate workflow

## 📧 Workflow Examples

### Example 1: Welcome Email (Instant)

```
Trigger: Subscriber joins "Users" group
Action: Send welcome email immediately
Content: Welcome message + 100 coins bonus
```

### Example 2: Onboarding Sequence (7 Days)

```
Day 0: Welcome email (instant)
Day 1: How to play guide
Day 3: First prediction tips
Day 5: Tournament introduction
Day 7: Advanced features
```

### Example 3: Engagement Campaign

```
Trigger: Subscriber inactive for 7 days
Action: Send re-engagement email
Content: Featured matches, special offers
```

## 🔧 API Integration

The MailerLite service is available in the codebase:

```typescript
import { mailerLiteService } from "@netprophet/lib";

// Add subscriber (triggers workflows automatically)
await mailerLiteService.addSubscriber("user@example.com", "John Doe", [
  "users",
]);

// Trigger specific workflow
await mailerLiteService.triggerWorkflow("user@example.com", "workflow_id_here");

// Update subscriber information
await mailerLiteService.updateSubscriber("user@example.com", {
  balance: 500,
  prediction_count: 10,
});

// Add to specific group
await mailerLiteService.addToGroup("user@example.com", "premium_users");
```

## 🛡️ Error Handling

The integration is designed to **never block user registration**:

- If MailerLite is unavailable, user registration continues
- Errors are logged but don't prevent user creation
- Transactional emails (Resend) continue to work normally
- MailerLite sync can be retried later if needed

## 📊 Monitoring

### MailerLite Dashboard

Monitor in MailerLite dashboard:

- Subscriber growth
- Email open rates
- Click rates
- Workflow performance
- Engagement metrics

### Supabase Logs

Check Edge Function logs:

```bash
supabase functions logs mailerlite-subscribe
```

## 🔒 Security

- API keys are stored as environment variables
- Never commit API keys to git
- Use different keys for development/production
- Rotate keys periodically

## 🆘 Troubleshooting

### Issue: Subscribers not being added

**Solution:**

1. Check `MAILERLITE_API_KEY` is set correctly
2. Verify API key permissions
3. Check Edge Function logs
4. Ensure MailerLite API is accessible

### Issue: Workflows not triggering

**Solution:**

1. Verify group IDs are correct
2. Check workflow is activated in MailerLite
3. Ensure trigger conditions are set correctly
4. Test with a manual subscriber first

### Issue: API rate limits

**Solution:**

1. MailerLite free tier: 1,000 subscribers
2. Upgrade if needed
3. Batch operations where possible
4. Implement retry logic for failed requests

## ✅ Testing

### Test Subscriber Addition

```bash
# Test the Edge Function directly
curl -X POST \
  https://your-project.supabase.co/functions/v1/mailerlite-subscribe \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "groups": ["users"]
  }'
```

### Test User Registration

1. Register a new user in the app
2. Check MailerLite dashboard for new subscriber
3. Verify welcome email workflow triggers
4. Confirm transactional emails still work (Resend)

## 📈 Next Steps

1. **Set up welcome email workflow** in MailerLite
2. **Create onboarding sequence** (3-7 emails)
3. **Configure engagement campaigns** for inactive users
4. **Set up segmentation** (active users, tournament participants)
5. **Monitor performance** and optimize based on metrics

## 🔗 Resources

- [MailerLite API Documentation](https://developers.mailerlite.com/docs)
- [MailerLite Automation Templates](https://www.mailerlite.com/automation-templates)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

Your MailerLite integration is now ready for automated marketing workflows! 🎉
