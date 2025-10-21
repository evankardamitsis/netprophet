-- Fix security issue with app_users view
-- The view is exposing auth.users data to public roles, which is a security concern

-- Drop the problematic view that exposes auth.users data
DROP VIEW IF EXISTS app_users;

-- Drop the new view if it exists (since views don't support RLS policies)
DROP VIEW IF EXISTS app_users_public;

-- Instead of creating a view, we'll rely on the existing profiles table with proper RLS policies
-- The profiles table already has proper RLS policies that control access to user data
-- This is a more secure approach than creating a view that exposes auth.users data

-- If you need to access user data, use the profiles table directly with proper RLS policies
-- The existing RLS policies on profiles table already ensure:
-- 1. Users can only see their own profile
-- 2. Admins can see all profiles (through the admin policy)
-- 3. Service role can access all profiles (for Edge Functions)
