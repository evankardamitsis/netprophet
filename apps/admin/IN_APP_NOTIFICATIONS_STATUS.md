# In-App Notifications System - Status & Integration

## Real-Time Subscription

✅ **Real-time subscription is now implemented** using Supabase Realtime:

- Listens for `INSERT` events on `admin_in_app_notifications` table
- Listens for `UPDATE` events (when notifications are marked as read)
- Automatically refreshes the notification list when changes occur
- Shows toast notifications for new items
- Works in both the notifications page and the TopBar bell dropdown

**Implementation:**

- Uses Supabase Realtime channels
- Subscribes to `postgres_changes` events
- Automatically cleans up subscriptions on unmount

## Events Currently Integrated

✅ **Priority 1 Events - INTEGRATED:**

1. **User Registration** (`user_registration`)
   - **Location**: `handle_new_user()` function
   - **Status**: ✅ Integrated
   - **Migration**: `20251220100000_integrate_notifications_user_registration.sql`
   - **Triggers**: When a new user registers (OAuth or email/password)

2. **Profile Creation Request** (`profile_creation_request`)
   - **Location**: `handle_profile_creation_request()` function
   - **Status**: ✅ Integrated
   - **Migration**: `20251220110000_integrate_notifications_profile_creation_request.sql`
   - **Triggers**: When user requests a new athlete profile

3. **Profile Activated** (`profile_activated`)
   - **Location**: Database trigger + notify-activation API route
   - **Status**: ✅ Integrated
   - **Migration**: `20251220120000_integrate_notifications_profile_activation.sql`
   - **Triggers**:
     - Automatically via trigger when player is activated and linked to user
     - Manually when admin clicks "Notify User" button

4. **User Deleted** (`user_deleted`)
   - **Location**: `/api/admin/delete-user` route
   - **Status**: ✅ Integrated
   - **Triggers**: When admin deletes a user

### Priority 2 - Medium Priority Events (Not Yet Integrated)

5. **Large Bet** (`large_bet`)
   - **Location**: Bet creation API
   - **Status**: ❌ Not integrated
   - **Action**: Add notification when bet amount exceeds threshold (e.g., > 1000 coins)

6. **Payment Received** (`payment_received`)
   - **Location**: Stripe webhook handler
   - **Status**: ❌ Not integrated
   - **Action**: Add notification when payment is successfully processed

7. **Tournament Created** (`tournament_created`)
   - **Location**: Tournament creation API
   - **Status**: ❌ Not integrated
   - **Action**: Add notification when new tournament is created

8. **Tournament Updated** (`tournament_updated`)
   - **Location**: Tournament update API
   - **Status**: ❌ Not integrated
   - **Action**: Add notification for significant tournament changes

### Priority 3 - Lower Priority Events (Not Yet Integrated)

9. **System Error** (`system_error`)
   - **Location**: Error handlers throughout the app
   - **Status**: ❌ Not integrated
   - **Action**: Add to critical error handlers

10. **Match Result Entered** (`match_result_entered`)
    - **Location**: Match result entry API
    - **Status**: ❌ Not integrated
    - **Action**: Add notification for important match results

11. **Player Created** (`player_created`)
    - **Location**: Player creation API
    - **Status**: ❌ Not integrated
    - **Action**: Add notification when new player is created

12. **Player Updated** (`player_updated`)
    - **Location**: Player update API
    - **Status**: ❌ Not integrated
    - **Action**: Add notification for significant player updates

13. **Suspicious Activity** (`suspicious_activity`)
    - **Location**: Various security checks
    - **Status**: ❌ Not integrated
    - **Action**: Add to fraud detection logic

14. **Wallet Issue** (`wallet_issue`)
    - **Location**: Wallet operations
    - **Status**: ❌ Not integrated
    - **Action**: Add for wallet errors or anomalies

## Integration Summary

### ✅ Completed Integrations

- **User Registration**: Creates notification when new users sign up
- **Profile Creation Request**: Creates notification when users request new athlete profiles
- **Profile Activation**:
  - Automatic trigger when player is activated and linked to user
  - Manual notification when admin clicks "Notify User"
- **User Deletion**: Creates notification when admin deletes a user

### 📋 Next Steps

1. ✅ Real-time subscription - **DONE**
2. ✅ Integrate Priority 1 events - **DONE**
3. ⏳ Integrate Priority 2 events (large bets, payments, tournaments)
4. ⏳ Integrate Priority 3 events (errors, match results, etc.)

## Testing

To test the integrated notifications:

1. **User Registration**: Create a new user account (OAuth or email/password)
2. **Profile Creation Request**: Complete the athlete registration flow and request a new profile
3. **Profile Activation**:
   - Create/edit a player in admin panel
   - Set `claimed_by_user_id` and `is_active = true`
   - Notification should appear automatically
4. **User Deletion**: Delete a user from the admin panel

All notifications should appear in real-time in the admin panel notification bell and `/in-app-notifications` page.
