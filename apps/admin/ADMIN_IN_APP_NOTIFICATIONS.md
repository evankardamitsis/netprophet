# Admin In-App Notifications System

This system provides real-time in-app notifications for admins to track important activities in the application. It is separate from email notifications.

## Features

- ✅ Real-time in-app notifications
- ✅ Severity levels (info, warning, error, success)
- ✅ Multiple notification types
- ✅ Mark as read/unread
- ✅ Filtering by type, severity, and read status
- ✅ Unread count badge in sidebar
- ✅ Auto-refresh every 30 seconds

## Database Schema

The `admin_in_app_notifications` table stores all notifications with:

- `type`: Notification type (user_registration, profile_creation_request, etc.)
- `severity`: info, warning, error, success
- `title`: Notification title
- `message`: Notification message
- `metadata`: JSONB field for additional context
- `is_read`: Read status
- `read_at`: When it was read
- `read_by`: Which admin read it

## Usage

### Creating Notifications

#### From API Routes (Server-side)

```typescript
import { AdminNotifications } from "@/lib/adminInAppNotifications";

// User registration
await AdminNotifications.userRegistered(userId, email, firstName, lastName);

// Profile creation request
await AdminNotifications.profileCreationRequest(
  userId,
  email,
  firstName,
  lastName
);

// Profile activated
await AdminNotifications.profileActivated(userId, playerId, playerName);

// Large bet
await AdminNotifications.largeBet(betId, userId, amount, "coins");

// System error
await AdminNotifications.systemError("Database connection failed", {
  context: "match_processing",
});

// Custom notification
await createAdminNotification({
  type: "custom_type",
  severity: "warning",
  title: "Custom Title",
  message: "Custom message",
  metadata: { custom_data: "value" },
});
```

#### From Database Functions (SQL)

```sql
-- Create a notification from a database function
SELECT create_admin_notification(
    'user_registration',           -- type
    'info',                        -- severity
    'New User Registration',       -- title
    'A new user has registered',   -- message
    '{"user_id": "123", "email": "user@example.com"}'::jsonb  -- metadata
);
```

## Integration Points

### 1. User Registration

Add to `handle_new_user` function or user registration API:

```sql
-- In handle_new_user function
PERFORM create_admin_notification(
    'user_registration',
    'info',
    'New User Registration',
    'A new user has registered: ' || NEW.email,
    jsonb_build_object(
        'user_id', NEW.id,
        'email', NEW.email
    )
);
```

### 2. Profile Creation Request

Add to `handle_profile_creation_request` function:

```sql
PERFORM create_admin_notification(
    'profile_creation_request',
    'warning',
    'Profile Creation Request',
    user_first_name || ' ' || user_last_name || ' has requested a new athlete profile',
    jsonb_build_object(
        'user_id', user_id,
        'first_name', user_first_name,
        'last_name', user_last_name,
        'date_of_birth', date_of_birth,
        'playing_hand', playing_hand
    )
);
```

### 3. Large Bets

Add to bet creation API:

```typescript
// In bet creation route
if (betAmount > LARGE_BET_THRESHOLD) {
  await AdminNotifications.largeBet(betId, userId, betAmount, "coins");
}
```

### 4. System Errors

Add to error handlers:

```typescript
try {
  // ... operation
} catch (error) {
  await AdminNotifications.systemError(error.message, {
    operation: "match_processing",
    match_id: matchId,
  });
  throw error;
}
```

## Notification Types

- `user_registration` - New user registered
- `profile_creation_request` - User requested new athlete profile
- `profile_activated` - Athlete profile was activated
- `large_bet` - Large bet placed
- `system_error` - System error occurred
- `tournament_created` - New tournament created
- `tournament_updated` - Tournament updated
- `match_result_entered` - Match result entered
- `payment_received` - Payment received
- `user_deleted` - User deleted
- `player_created` - Player created
- `player_updated` - Player updated
- `suspicious_activity` - Suspicious activity detected
- `wallet_issue` - Wallet issue
- `other` - Other notifications

## Admin UI

Access the notifications page at: `/in-app-notifications`

Features:

- View all notifications
- Filter by type, severity, read status
- Mark individual notifications as read
- Mark all as read
- Delete notifications
- Auto-refresh every 30 seconds
- Unread count badge in sidebar

## API Endpoints

- `GET /api/admin/in-app-notifications` - Fetch notifications (with filters)
- `POST /api/admin/in-app-notifications` - Create notification
- `PATCH /api/admin/in-app-notifications/[id]` - Mark as read
- `DELETE /api/admin/in-app-notifications/[id]` - Delete notification
- `POST /api/admin/in-app-notifications/mark-all-read` - Mark all as read

## Deployment

1. Apply the migration:

   ```bash
   supabase db push
   ```

2. Deploy the Supabase function:

   ```bash
   supabase functions deploy create-admin-notification
   ```

3. The admin UI is already available at `/in-app-notifications`

## Next Steps

Consider integrating notifications for:

- Tournament creation/updates
- Match result entries
- Payment processing
- User deletions
- Suspicious activity detection
- System health monitoring
