# Quick Test Guide: Athlete Registration Flow

## 🚀 Quick Start Testing

### Option 1: SQL Test (Fastest)

Run this in **Supabase SQL Editor**:

```sql
-- Quick test: Create a user with email pattern
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'test.john.doe@example.com',
    crypt('test123', gen_salt('bf')),
    NOW(),
    '{}'::jsonb,  -- Empty = simulates Google OAuth
    NOW(),
    NOW()
);

-- Wait a moment, then check
SELECT email, first_name, last_name
FROM profiles
WHERE email = 'test.john.doe@example.com';
-- Expected: first_name = "Test", last_name = "Doe"
```

### Option 2: Use Test Script

```bash
# Run the test script
./scripts/test-athlete-registration.sh

# Or use the comprehensive SQL test file
# Copy contents from: supabase/test_email_name_extraction.sql
# Run in Supabase SQL Editor
```

### Option 3: Manual UI Testing

1. **Test Email Extraction**:
   - Create a test user via API or SQL (see above)
   - Sign in with the test credentials
   - Check if names were extracted in the profile

2. **Test Pending Status**:

   ```sql
   -- Set a user to pending
   UPDATE profiles
   SET profile_claim_status = 'pending'
   WHERE email = 'your-test-email@example.com';
   ```

   - Sign in as that user
   - Navigate to `/auth/profile-setup`
   - Should see success screen immediately (not stuck in checking)

3. **Test Full Flow**:
   - Sign up with Google (use a test account)
   - If no name provided, check if extracted from email
   - Go through profile setup flow
   - Verify no infinite loops

## ✅ What to Check

### Email Name Extraction

- [ ] Names extracted from `firstname.lastname@email.com`
- [ ] Names extracted from `firstname_lastname@email.com`
- [ ] Names extracted from `firstname-lastname@email.com`
- [ ] Single name extracted from `name@email.com`

### Pending Status Flow

- [ ] Users with `pending` status see success screen
- [ ] No infinite checking/searching loop
- [ ] Flow completes properly

### Form Submission

- [ ] After entering name, searches database
- [ ] Shows appropriate result (match/no match)
- [ ] After creating profile, shows success screen
- [ ] Status updates correctly

## 🔍 Verification Queries

```sql
-- Check recent users and their extracted names
SELECT
    u.email,
    u.raw_user_meta_data,
    p.first_name,
    p.last_name,
    p.profile_claim_status
FROM auth.users u
JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;

-- Check if email extraction worked
SELECT
    email,
    first_name,
    last_name,
    SPLIT_PART(email, '@', 1) AS email_local_part
FROM profiles
WHERE created_at > NOW() - INTERVAL '1 hour'
AND (
    first_name IS NOT NULL OR
    last_name IS NOT NULL
);
```

## 🐛 Troubleshooting

**Names not extracted?**

- Check if trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
- Check function: `SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';`
- Check migration was applied: `SELECT * FROM supabase_migrations.schema_migrations WHERE name LIKE '%email_extraction%';`

**Pending status not working?**

- Check browser console for errors
- Verify profile status: `SELECT profile_claim_status FROM profiles WHERE email = '...';`
- Check if component is checking status before lookup

## 📝 Test Credentials

After running SQL tests, you can sign in with:

- Email: `test.john.doe@example.com` (or whatever you created)
- Password: `testpassword123` (or `test123` depending on test)

## 🧹 Cleanup

```sql
-- Delete test users (be careful!)
DELETE FROM profiles WHERE email LIKE '%test%' OR email LIKE '%example.com';
DELETE FROM auth.users WHERE email LIKE '%test%' OR email LIKE '%example.com';
```
