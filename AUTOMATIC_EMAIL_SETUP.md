# Automatic Email Processing Setup

This guide explains how to set up automatic email processing for admin notifications.

## Overview

The system now automatically processes admin emails every 5 minutes using a cron job, eliminating the need for manual intervention.

## How It Works

1. **Email Creation**: When admin alerts are triggered (new user registrations, etc.), emails are logged with status "pending"
2. **Automatic Processing**: A cron job runs every 5 minutes to process pending emails
3. **Status Updates**: Emails are marked as "sent" or "failed" based on the processing result
4. **Manual Override**: The "Process Email Queue" button is still available for immediate processing

## Setup Steps

### 1. Environment Variables

Add the following environment variable to your admin app:

```env
# Cron job secret for authentication
CRON_SECRET=your_secure_random_string_here
```

### 2. Deploy the Cron Job

The cron job is configured in `apps/admin/cron.json` and runs every 5 minutes:

```json
{
  "cron": [
    {
      "name": "process-admin-emails",
      "schedule": "*/5 * * * *",
      "endpoint": "/api/cron/process-emails",
      "description": "Process pending admin emails every 5 minutes"
    }
  ]
}
```

### 3. Vercel Cron Job Setup

For Vercel deployment, you need to configure the cron job in your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-emails",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### 4. Test the System

1. **Trigger an Admin Alert**: Use the "Test Admin Notifications" button
2. **Check Email Logs**: Verify emails are created with "pending" status
3. **Wait for Processing**: Emails should be automatically processed within 5 minutes
4. **Verify Results**: Check that emails are marked as "sent" or "failed"

## Monitoring

### Email Status Types

- **pending**: Email is queued for processing
- **sent**: Email was successfully sent
- **failed**: Email sending failed (check error details)

### Manual Processing

The manual "Process Email Queue" button is still available for:

- Immediate processing when needed
- Testing the email system
- Processing failed emails that need retry

## Troubleshooting

### Common Issues

1. **Emails not processing automatically**
   - Check if cron job is properly configured
   - Verify CRON_SECRET environment variable
   - Check Vercel function logs

2. **Emails stuck in pending status**
   - Use manual "Process Email Queue" button
   - Check for errors in the cron job logs

3. **Template errors**
   - Verify admin_alert template exists in database
   - Check template variables are correct

### Logs

Monitor the following for troubleshooting:

- Vercel function logs for cron job execution
- Email logs table for email status
- Admin notifications page for test results

## Configuration

### Changing Processing Frequency

To change how often emails are processed, update the cron schedule in:

- `apps/admin/cron.json` (for local development)
- `vercel.json` (for production deployment)

Example schedules:

- Every 2 minutes: `*/2 * * * *`
- Every 10 minutes: `*/10 * * * *`
- Every hour: `0 * * * *`

### Batch Size

The system processes up to 50 emails per run to prevent timeouts. This can be adjusted in the cron endpoint if needed.
