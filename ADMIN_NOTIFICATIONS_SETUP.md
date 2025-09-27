# Admin Notifications Setup Guide

This guide explains how to set up and configure the admin notification system for NetProphet.

## Overview

The admin notification system automatically sends email notifications to administrators when:

1. A new user registers on the platform
2. A user claims their player profile

## Setup Steps

### 1. Environment Variables

Add the following environment variables to your admin app:

```env
# Admin notification emails (comma-separated)
ADMIN_EMAILS=admin1@example.com,admin2@example.com

# Resend API key for sending emails
RESEND_API_KEY=your_resend_api_key

# Supabase configuration (should already exist)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Admin API URL (for Supabase functions)
ADMIN_API_URL=http://localhost:3001
```

### 2. Database Migration

Run the database migration to create the notification system:

```bash
# Apply the migration
supabase db push

# Or if using SQL directly, run the contents of:
# supabase/migrations/20250121000001_add_admin_notification_triggers.sql
```

### 3. Deploy Supabase Functions

Deploy the required Supabase functions:

```bash
# Deploy the admin notifications function
supabase functions deploy admin-notifications

# Deploy the notification processor function
supabase functions deploy process-admin-notifications
```

### 4. Configure Cron Job

The notification processor runs every 5 minutes via a cron job. This is configured in:

- `supabase/functions/process-admin-notifications/cron.json`

To modify the schedule, update the cron expression in this file.

### 5. Test the System

1. **Access Admin Notifications Page**: Navigate to `/admin-notifications` in your admin panel
2. **Register a Test User**: Create a new user account to trigger a registration notification
3. **Claim a Player Profile**: Have a user claim their player profile to trigger a profile claim notification
4. **Check Notifications**: View the notifications in the admin panel and verify emails are sent

## System Architecture

### Database Components

1. **`admin_notifications` table**: Stores pending notifications
2. **Database triggers**: Automatically create notification records
3. **`process_pending_admin_notifications()` function**: Processes pending notifications

### API Endpoints

1. **`/api/admin/notifications` (GET)**: Fetch notification history
2. **`/api/admin/notifications` (POST)**: Send notification emails
3. **`/api/admin/notifications/process` (POST)**: Process pending notifications

### Supabase Functions

1. **`admin-notifications`**: Handles notification sending logic
2. **`process-admin-notifications`**: Cron job that processes pending notifications

## Email Templates

The system generates HTML emails with:

- **User Registration**: Blue gradient header with user details
- **Profile Claim**: Green gradient header with user and player details

Both templates include:

- User ID, email, and registration date
- Player information (for profile claims)
- Professional styling with NetProphet branding

## Monitoring

### Admin Panel Features

- **Real-time Statistics**: Total, pending, sent, and failed notifications
- **Notification History**: View all notifications with filtering
- **Manual Processing**: Button to manually process pending notifications
- **Error Tracking**: View failed notifications with error messages

### Database Queries

Monitor the system with these queries:

```sql
-- View pending notifications
SELECT * FROM admin_notifications WHERE status = 'pending';

-- View recent notifications
SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 10;

-- View failed notifications
SELECT * FROM admin_notifications WHERE status = 'failed';
```

## Troubleshooting

### Common Issues

1. **Emails not sending**:
   - Check `ADMIN_EMAILS` environment variable
   - Verify `RESEND_API_KEY` is correct
   - Check Resend account limits

2. **Notifications not processing**:
   - Verify Supabase functions are deployed
   - Check cron job is running
   - Review function logs in Supabase dashboard

3. **Database errors**:
   - Ensure migration was applied successfully
   - Check database triggers are created
   - Verify foreign key constraints

### Manual Processing

If notifications get stuck, you can manually process them:

1. Go to `/admin-notifications` in admin panel
2. Click "Process Pending" button
3. Or call the API directly: `POST /api/admin/notifications/process`

## Security Considerations

- Admin emails are configured via environment variables
- Database functions use `SECURITY DEFINER` for proper permissions
- Email sending is rate-limited by Resend
- Failed notifications are logged for debugging

## Customization

### Adding New Notification Types

1. Add new type to the `admin_notifications` table check constraint
2. Update the trigger functions
3. Add email template generation
4. Update the admin panel UI

### Modifying Email Templates

Edit the `generateUserRegistrationEmail()` and `generateProfileClaimEmail()` functions in:
`apps/admin/src/app/api/admin/notifications/route.ts`

### Changing Processing Frequency

Update the cron expression in:
`supabase/functions/process-admin-notifications/cron.json`

## Support

For issues or questions:

1. Check the admin notifications page for error messages
2. Review Supabase function logs
3. Check database for pending/failed notifications
4. Verify environment variables are set correctly
