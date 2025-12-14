# Testing Guide: Athlete Registration Flow Fixes

This guide helps you test the fixes we made for:

1. **Google signup name extraction from email**
2. **Pending application screen fix**

## Test Scenarios

### Scenario 1: Google OAuth Signup with Email-Based Name Extraction

**Goal**: Verify that when a user signs up with Google and doesn't provide a name, the system extracts it from their email.

#### Test Steps:

1. **Create a test user simulating Google OAuth (no name in metadata, but email has name pattern)**

   Use the Supabase dashboard SQL editor or run this SQL:

   ```sql
   -- Create a test user simulating Google OAuth signup
   -- This simulates a user who signed up with Google but has no name in metadata
   INSERT INTO auth.users (
       instance_id,
       id,
       aud,
       role,
       email,
       encrypted_password,
       email_confirmed_at,
       raw_user_meta_data,
       created_at,
       updated_at
   ) VALUES (
       '00000000-0000-0000-0000-000000000000',
       gen_random_uuid(),
       'authenticated',
       'authenticated',
       'john.doe.test@example.com',  -- Email with name pattern
       crypt('testpassword123', gen_salt('bf')),
       NOW(),
       '{}'::jsonb,  -- Empty metadata (simulating Google OAuth without name)
       NOW(),
       NOW()
   ) RETURNING id, email;
   ```

   **Note**: The trigger will automatically run `handle_new_user()` which should extract "John" and "Doe" from the email.

2. **Verify the profile was created with extracted names**

   ```sql
   -- Check the profile that was created
   SELECT
       id,
       email,
       first_name,
       last_name,
       profile_claim_status,
       created_at
   FROM profiles
   WHERE email = 'john.doe.test@example.com';
   ```

   **Expected Result**:
   - `first_name` should be "John"
   - `last_name` should be "Doe"
   - Extracted from email `john.doe.test@example.com`

3. **Test different email patterns**

   Test these email patterns to verify extraction works:
   - `firstname.lastname@example.com` → Firstname Lastname
   - `first_last@example.com` → First Last
   - `first-last@example.com` → First Last
   - `firstname@example.com` → Firstname (only first name)

### Scenario 2: Test Pending Application Screen

**Goal**: Verify that users with pending status see the success screen instead of getting stuck in lookup.

#### Test Steps:

1. **Create a test user with pending status**

   Use the API endpoint or SQL:

   ```sql
   -- Create a test user with pending status
   INSERT INTO auth.users (
       instance_id,
       id,
       aud,
       role,
       email,
       encrypted_password,
       email_confirmed_at,
       raw_user_meta_data,
       created_at,
       updated_at
   ) VALUES (
       '00000000-0000-0000-0000-000000000000',
       gen_random_uuid(),
       'authenticated',
       'authenticated',
       'pending.user@example.com',
       crypt('testpassword123', gen_salt('bf')),
       NOW(),
       jsonb_build_object('firstName', 'Pending', 'lastName', 'User'),
       NOW(),
       NOW()
   ) RETURNING id;

   -- Set profile to pending status
   UPDATE profiles
   SET profile_claim_status = 'pending'
   WHERE email = 'pending.user@example.com';
   ```

2. **Sign in as the test user**
   - Go to `/auth/signin`
   - Sign in with: `pending.user@example.com` / `testpassword123`
   - Navigate to `/auth/profile-setup` (or it should redirect automatically)

3. **Verify the flow**

   **Expected Behavior**:
   - Should show "checking" step briefly
   - Should immediately detect pending status
   - Should show success screen with "Request Submitted" message
   - Should NOT go back to searching database
   - Should NOT get stuck in a loop

### Scenario 3: Test Form Submission Flow

**Goal**: Verify that after entering credentials, the flow works correctly.

#### Test Steps:

1. **Create a Google OAuth user without names**

   ```sql
   -- Create user without names (simulating Google OAuth)
   INSERT INTO auth.users (
       instance_id,
       id,
       aud,
       role,
       email,
       encrypted_password,
       email_confirmed_at,
       raw_user_meta_data,
       created_at,
       updated_at
   ) VALUES (
       '00000000-0000-0000-0000-000000000000',
       gen_random_uuid(),
       'authenticated',
       'authenticated',
       'no.name.user@example.com',
       crypt('testpassword123', gen_salt('bf')),
       NOW(),
       '{}'::jsonb,  -- No name metadata
       NOW(),
       NOW()
   ) RETURNING id;
   ```

2. **Sign in and go through the flow**
   - Sign in with: `no.name.user@example.com` / `testpassword123`
   - Should be redirected to profile setup
   - Should see "checking" step
   - Should see form to enter name (since no name was extracted from email)
   - Enter name: "Test User"
   - Submit form
   - Should search database
   - If no matches: Should show result step with option to create profile
   - If matches found: Should show match selection

3. **After creating profile request**
   - Click "Request New Profile"
   - Should show success screen
   - Status should be "creation_requested"
   - Should NOT go back to checking/searching

## Using the Test API Endpoint

You can also use the existing test user creation API:

```bash
# Create a test user with Google OAuth simulation (no names)
curl -X POST http://localhost:3000/api/admin/create-test-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.oauth@example.com",
    "password": "testpassword123",
    "firstName": "",
    "lastName": "",
    "profileClaimStatus": null
  }'
```

**Note**: The API creates users with email/password, but you can manually update the `raw_user_meta_data` in the database to simulate OAuth.

## Manual Testing with Real Google OAuth

1. **Use a test Google account** (or create one)
2. **Sign up with Google** on your development environment
3. **Check the database** to see if names were extracted:
   ```sql
   SELECT
       u.email,
       u.raw_user_meta_data,
       p.first_name,
       p.last_name
   FROM auth.users u
   JOIN profiles p ON u.id = p.id
   WHERE u.email = 'your-test-email@gmail.com';
   ```

## SQL Queries for Verification

### Check all users with extracted names from email

```sql
-- Find users whose names were likely extracted from email
SELECT
    p.email,
    p.first_name,
    p.last_name,
    u.raw_user_meta_data,
    p.profile_claim_status,
    p.created_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE
    -- Email pattern matches name pattern
    (
        LOWER(SPLIT_PART(p.email, '@', 1)) LIKE LOWER('%' || p.first_name || '%') OR
        LOWER(SPLIT_PART(p.email, '@', 1)) LIKE LOWER('%' || p.last_name || '%')
    )
    AND (
        -- No name in metadata (OAuth user)
        u.raw_user_meta_data->>'firstName' IS NULL AND
        u.raw_user_meta_data->>'lastName' IS NULL AND
        u.raw_user_meta_data->>'name' IS NULL
    )
ORDER BY p.created_at DESC
LIMIT 10;
```

### Check pending status users

```sql
-- Find users with pending status
SELECT
    p.email,
    p.first_name,
    p.last_name,
    p.profile_claim_status,
    p.profile_claim_completed_at,
    p.created_at
FROM profiles p
WHERE p.profile_claim_status = 'pending'
ORDER BY p.created_at DESC;
```

### Test the email extraction function directly

```sql
-- Test email name extraction logic
WITH test_emails AS (
    SELECT unnest(ARRAY[
        'john.doe@example.com',
        'jane_smith@example.com',
        'bob-wilson@example.com',
        'alice@example.com'
    ]) AS email
)
SELECT
    email,
    SPLIT_PART(email, '@', 1) AS local_part,
    REPLACE(REPLACE(REPLACE(SPLIT_PART(email, '@', 1), '.', ' '), '_', ' '), '-', ' ') AS cleaned,
    string_to_array(
        REPLACE(REPLACE(REPLACE(SPLIT_PART(email, '@', 1), '.', ' '), '_', ' '), '-', ' '),
        ' '
    ) AS parts,
    CASE
        WHEN array_length(string_to_array(REPLACE(REPLACE(REPLACE(SPLIT_PART(email, '@', 1), '.', ' '), '_', ' '), '-', ' '), ' '), 1) >= 2
        THEN INITCAP((string_to_array(REPLACE(REPLACE(REPLACE(SPLIT_PART(email, '@', 1), '.', ' '), '_', ' '), '-', ' '), ' '))[1])
        ELSE NULL
    END AS extracted_first_name,
    CASE
        WHEN array_length(string_to_array(REPLACE(REPLACE(REPLACE(SPLIT_PART(email, '@', 1), '.', ' '), '_', ' '), '-', ' '), ' '), 1) >= 2
        THEN INITCAP((string_to_array(REPLACE(REPLACE(REPLACE(SPLIT_PART(email, '@', 1), '.', ' '), '_', ' '), '-', ' '), ' '))[array_length(string_to_array(REPLACE(REPLACE(REPLACE(SPLIT_PART(email, '@', 1), '.', ' '), '_', ' '), '-', ' '), ' '), 1)])
        ELSE NULL
    END AS extracted_last_name
FROM test_emails;
```

## Expected Results Summary

### ✅ Success Criteria

1. **Email Name Extraction**:
   - Users with emails like `john.doe@example.com` should have `first_name = "John"` and `last_name = "Doe"`
   - Users with single-part emails like `alice@example.com` should have `first_name = "Alice"` and `last_name = NULL`
   - Extraction should work for `.`, `_`, and `-` separators

2. **Pending Status Flow**:
   - Users with `profile_claim_status = 'pending'` should see success screen immediately
   - Should NOT trigger database lookup again
   - Should NOT get stuck in checking/searching loop

3. **Form Submission**:
   - After entering name and submitting, should search database
   - If no matches: show result step with create option
   - After creating profile: show success screen with "creation_requested" status
   - Should NOT loop back to checking

## Troubleshooting

### Names not being extracted

1. Check if the trigger is running:

   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

2. Check the function exists:

   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
   ```

3. Check recent user registrations:
   ```sql
   SELECT
       u.email,
       u.raw_user_meta_data,
       p.first_name,
       p.last_name,
       p.created_at
   FROM auth.users u
   LEFT JOIN profiles p ON u.id = p.id
   ORDER BY u.created_at DESC
   LIMIT 5;
   ```

### Pending status not working

1. Check the profile status:

   ```sql
   SELECT email, profile_claim_status, profile_claim_completed_at
   FROM profiles
   WHERE email = 'your-test-email@example.com';
   ```

2. Check browser console for errors
3. Verify the `ProfileClaimFlowNew` component is checking for pending status before lookup

## Cleanup

After testing, you may want to clean up test users:

```sql
-- Delete test users (be careful!)
DELETE FROM profiles WHERE email LIKE '%test%' OR email LIKE '%example.com';
DELETE FROM auth.users WHERE email LIKE '%test%' OR email LIKE '%example.com';
```
