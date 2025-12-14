# Testing Guide: New Simplified Athlete Registration Flow

## Overview

The athlete registration flow has been simplified. **All users** (regardless of registration method) now go through the same flow:

1. **Form Step**: Always shows a form asking for:
   - First Name
   - Last Name
   - Date of Birth (to calculate age)
   - Playing Hand (Left/Right)

2. **Result Step**: After form submission, searches database and shows:
   - Match found (single or multiple)
   - No match found (option to create new profile)

3. **Success Step**: Shows after claiming or requesting profile creation

## How to Test

### Option 1: Use Test Dashboard (Recommended)

1. **Navigate to test dashboard** (admin only):

   ```
   /en/test-profile-claim-dashboard
   ```

2. **Choose a test mode**:
   - **Enhanced Testing**: Test with existing users from your database
   - **Scenario Testing**: Create test users with different scenarios
   - **Manual Testing**: Test with a specific user ID

3. **Test the flow**:
   - Click "Create & Test" or select a user
   - Click "Test Flow"
   - You should see the form asking for: First Name, Last Name, Date of Birth, Playing Hand
   - Fill out the form and submit
   - Verify the lookup works correctly
   - Test claiming, creating new profile, or skipping

### Option 2: Manual Testing

1. **Create a test user** (via API or SQL):

   ```bash
   curl -X POST http://localhost:3000/api/admin/create-test-user \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test.athlete@example.com",
       "password": "testpassword123",
       "firstName": "",
       "lastName": ""
     }'
   ```

2. **Sign in** with the test user credentials

3. **Navigate to profile setup**:
   - Go to `/en/auth/profile-setup` or
   - Click on profile setup notification if available

4. **Test the flow**:
   - Should see form with 4 fields (First Name, Last Name, DOB, Playing Hand)
   - Fill out all fields
   - Submit form
   - Should search database
   - Should show results based on matches

### Option 3: Test with Real Google OAuth

1. **Sign up with Google** using a test account
2. **Navigate to profile setup**
3. **Verify**:
   - Form shows (not auto-lookup)
   - All 4 fields are required
   - After submission, lookup works correctly

## What to Verify

### ✅ Form Fields

- [ ] First Name field appears and is required
- [ ] Last Name field appears and is required
- [ ] Date of Birth field appears and is required
- [ ] Playing Hand dropdown appears (Left/Right) and is required
- [ ] Age is calculated and displayed when DOB is entered
- [ ] Form validation works (all fields required, age 16-80)

### ✅ Flow Behavior

- [ ] Form always shows first (unless user already completed/pending)
- [ ] After form submission, shows "checking" briefly
- [ ] Then shows results (match/no match/multiple matches)
- [ ] No infinite loops or stuck states
- [ ] Pending status users see success screen immediately

### ✅ Database Lookup

- [ ] Search uses First Name and Last Name
- [ ] Shows matches if found
- [ ] Shows "no match" if not found
- [ ] Allows claiming if match found
- [ ] Allows creating new profile if no match

### ✅ Profile Creation

- [ ] After requesting profile creation, shows success screen
- [ ] Status updates to "creation_requested"
- [ ] DOB and playing hand stored in user metadata for admin reference

## Test Scenarios

### Scenario 1: New User - No Existing Profile

1. Create user with no name
2. Go to profile setup
3. Fill form: John Doe, DOB: 1990-01-01, Hand: Right
4. Submit
5. **Expected**: Shows "no match" → option to create profile

### Scenario 2: User with Matching Profile

1. Create user
2. Ensure a player exists in database with matching name
3. Fill form with matching name
4. Submit
5. **Expected**: Shows match → option to claim

### Scenario 3: User with Pending Status

1. Create user and set `profile_claim_status = 'pending'`
2. Go to profile setup
3. **Expected**: Shows success screen immediately (not form)

### Scenario 4: User Already Claimed

1. Create user and set `profile_claim_status = 'claimed'`
2. Go to profile setup
3. **Expected**: Shows success screen with claimed player info

## Common Issues to Check

1. **Form not showing**: Check if user status is already completed/pending
2. **Age calculation wrong**: Verify DOB validation (16-80 years)
3. **Lookup not working**: Check database connection and `find_matching_players` function
4. **Stuck in checking**: Verify flow doesn't loop back to checking after form submission

## Quick Test Checklist

- [ ] Form appears with all 4 fields
- [ ] All fields are required
- [ ] Age calculates correctly from DOB
- [ ] Form submission triggers database lookup
- [ ] Results show correctly (match/no match)
- [ ] Claiming works
- [ ] Profile creation request works
- [ ] Success screen shows after completion
- [ ] Pending users see success screen (not form)
- [ ] Already claimed users see success screen (not form)

## Accessing Test Dashboard

**URL**: `/{lang}/test-profile-claim-dashboard`

**Requirements**:

- Must be logged in
- Must be an admin user

**Features**:

- Test with existing users
- Create test users with different scenarios
- Test with specific user IDs
- View test results and debug info
