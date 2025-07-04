-- Simple script to fix existing users without creating duplicate triggers
-- This script only adds missing user records, doesn't create new triggers

-- Fix existing users who might not have records in users table
INSERT INTO public.users (id, email, username, password_hash, created_at, updated_at, is_verified)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'username', 'user_' || substr(au.id::text, 1, 8)),
  'placeholder_hash_' || au.id, -- Placeholder since we don't have actual password hash
  au.created_at,
  au.updated_at,
  au.email_confirmed_at IS NOT NULL -- Set verified based on email confirmation
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL;

-- Fix existing users who might not have records in user_profiles table
INSERT INTO public.user_profiles (user_id, created_at, updated_at)
SELECT 
  au.id,
  au.created_at,
  au.updated_at
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL; 