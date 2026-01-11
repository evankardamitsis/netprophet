# MailerLite Subscribe Edge Function

This function adds new subscribers to MailerLite for automated marketing workflows.

## Purpose

- Add new users to MailerLite when they register
- Trigger automated welcome email sequences
- Enable onboarding workflows
- Enable marketing campaigns

## Important Note

**This is completely separate from transactional emails.** Transactional emails (2FA, winnings notifications, admin alerts) still use Resend and are not affected by this integration.

## Environment Variables

- `MAILERLITE_API_KEY` - Your MailerLite API token
- `MAILERLITE_GROUP_ID` - Default group ID to add subscribers to (optional)

## Usage

```typescript
const { data, error } = await supabase.functions.invoke(
  "mailerlite-subscribe",
  {
    body: {
      email: "user@example.com",
      name: "John Doe",
      groups: ["users"], // Optional
    },
  }
);
```

## Error Handling

This function is designed to **never block user registration**. If MailerLite fails:

- Returns HTTP 200 (success) with error details
- Logs the error for debugging
- User registration continues normally
- Transactional emails still work via Resend

## Workflow Setup

After deployment, set up automated workflows in MailerLite dashboard:

1. **Welcome Email Sequence**: Trigger when subscriber joins "users" group
2. **Onboarding Series**: Send educational emails over 3-7 days
3. **Engagement Campaigns**: Based on user activity
