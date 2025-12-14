-- Test script for email-based name extraction
-- Run this in Supabase SQL Editor to test the handle_new_user function

-- Test 1: Create a user with email pattern john.doe@example.com
-- This should extract "John" and "Doe" as first and last name
DO $$
DECLARE
    test_user_id UUID;
    test_email TEXT := 'john.doe.test' || extract(epoch from now())::text || '@example.com';
BEGIN
    -- Create user (this will trigger handle_new_user)
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
        test_email,
        crypt('testpassword123', gen_salt('bf')),
        NOW(),
        '{}'::jsonb,  -- Empty metadata (simulating Google OAuth)
        NOW(),
        NOW()
    ) RETURNING id INTO test_user_id;
    
    -- Wait a moment for trigger to complete
    PERFORM pg_sleep(0.5);
    
    -- Check if names were extracted
    RAISE NOTICE 'Test 1: Email: %', test_email;
    RAISE NOTICE 'Expected: first_name = "John", last_name = "Doe"';
    
    PERFORM * FROM profiles WHERE id = test_user_id;
END $$;

-- Verify Test 1 results
SELECT 
    'Test 1: john.doe pattern' AS test_name,
    email,
    first_name,
    last_name,
    CASE 
        WHEN first_name = 'John' AND last_name = 'Doe' THEN '✓ PASS'
        ELSE '✗ FAIL - Expected: John Doe, Got: ' || COALESCE(first_name, 'NULL') || ' ' || COALESCE(last_name, 'NULL')
    END AS result
FROM profiles
WHERE email LIKE 'john.doe.test%@example.com'
ORDER BY created_at DESC
LIMIT 1;

-- Test 2: Create a user with underscore pattern jane_smith@example.com
DO $$
DECLARE
    test_user_id UUID;
    test_email TEXT := 'jane_smith.test' || extract(epoch from now())::text || '@example.com';
BEGIN
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
        test_email,
        crypt('testpassword123', gen_salt('bf')),
        NOW(),
        '{}'::jsonb,
        NOW(),
        NOW()
    ) RETURNING id INTO test_user_id;
    
    PERFORM pg_sleep(0.5);
    
    RAISE NOTICE 'Test 2: Email: %', test_email;
    RAISE NOTICE 'Expected: first_name = "Jane", last_name = "Smith"';
END $$;

-- Verify Test 2 results
SELECT 
    'Test 2: jane_smith pattern' AS test_name,
    email,
    first_name,
    last_name,
    CASE 
        WHEN first_name = 'Jane' AND last_name = 'Smith' THEN '✓ PASS'
        ELSE '✗ FAIL - Expected: Jane Smith, Got: ' || COALESCE(first_name, 'NULL') || ' ' || COALESCE(last_name, 'NULL')
    END AS result
FROM profiles
WHERE email LIKE 'jane_smith.test%@example.com'
ORDER BY created_at DESC
LIMIT 1;

-- Test 3: Create a user with hyphen pattern bob-wilson@example.com
DO $$
DECLARE
    test_user_id UUID;
    test_email TEXT := 'bob-wilson.test' || extract(epoch from now())::text || '@example.com';
BEGIN
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
        test_email,
        crypt('testpassword123', gen_salt('bf')),
        NOW(),
        '{}'::jsonb,
        NOW(),
        NOW()
    ) RETURNING id INTO test_user_id;
    
    PERFORM pg_sleep(0.5);
    
    RAISE NOTICE 'Test 3: Email: %', test_email;
    RAISE NOTICE 'Expected: first_name = "Bob", last_name = "Wilson"';
END $$;

-- Verify Test 3 results
SELECT 
    'Test 3: bob-wilson pattern' AS test_name,
    email,
    first_name,
    last_name,
    CASE 
        WHEN first_name = 'Bob' AND last_name = 'Wilson' THEN '✓ PASS'
        ELSE '✗ FAIL - Expected: Bob Wilson, Got: ' || COALESCE(first_name, 'NULL') || ' ' || COALESCE(last_name, 'NULL')
    END AS result
FROM profiles
WHERE email LIKE 'bob-wilson.test%@example.com'
ORDER BY created_at DESC
LIMIT 1;

-- Test 4: Single name pattern alice@example.com
DO $$
DECLARE
    test_user_id UUID;
    test_email TEXT := 'alice.test' || extract(epoch from now())::text || '@example.com';
BEGIN
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
        test_email,
        crypt('testpassword123', gen_salt('bf')),
        NOW(),
        '{}'::jsonb,
        NOW(),
        NOW()
    ) RETURNING id INTO test_user_id;
    
    PERFORM pg_sleep(0.5);
    
    RAISE NOTICE 'Test 4: Email: %', test_email;
    RAISE NOTICE 'Expected: first_name = "Alice", last_name = NULL or empty';
END $$;

-- Verify Test 4 results
SELECT 
    'Test 4: alice single name' AS test_name,
    email,
    first_name,
    last_name,
    CASE 
        WHEN first_name = 'Alice' AND (last_name IS NULL OR last_name = '') THEN '✓ PASS'
        ELSE '✗ FAIL - Expected: Alice (no last name), Got: ' || COALESCE(first_name, 'NULL') || ' ' || COALESCE(last_name, 'NULL')
    END AS result
FROM profiles
WHERE email LIKE 'alice.test%@example.com'
ORDER BY created_at DESC
LIMIT 1;

-- Summary: Show all test results
SELECT 
    '=== TEST SUMMARY ===' AS summary,
    COUNT(*) FILTER (WHERE first_name IS NOT NULL AND first_name != '') AS users_with_first_name,
    COUNT(*) FILTER (WHERE last_name IS NOT NULL AND last_name != '') AS users_with_last_name,
    COUNT(*) AS total_test_users
FROM profiles
WHERE email LIKE '%.test%@example.com'
AND created_at > NOW() - INTERVAL '5 minutes';
