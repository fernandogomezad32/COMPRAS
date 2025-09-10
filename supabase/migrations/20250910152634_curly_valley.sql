/*
  # Create super admin user for estivenmendezr@gmail.com

  1. New User Creation
    - Creates user in auth.users table with encrypted password
    - Email: estivenmendezr@gmail.com
    - Password: admin123 (encrypted)
    - Email confirmed automatically

  2. User Profile
    - Creates profile in user_profiles table
    - Role: super_admin
    - Status: active
    - Full access to all system functions

  3. Security
    - Password properly encrypted using crypt() function
    - User marked as email confirmed
    - Profile linked to auth user
*/

-- Create the super admin user in auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'estivenmendezr@gmail.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Estiven Mendez"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO UPDATE SET
  encrypted_password = crypt('admin123', gen_salt('bf')),
  email_confirmed_at = NOW(),
  updated_at = NOW();

-- Create or update the user profile
INSERT INTO public.user_profiles (
  id,
  email,
  full_name,
  role,
  status,
  created_by,
  created_at,
  updated_at
) 
SELECT 
  u.id,
  'estivenmendezr@gmail.com',
  'Estiven Mendez',
  'super_admin',
  'active',
  NULL,
  NOW(),
  NOW()
FROM auth.users u 
WHERE u.email = 'estivenmendezr@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  status = 'active',
  updated_at = NOW();

-- Also update by email in case the user already exists
UPDATE public.user_profiles 
SET 
  role = 'super_admin',
  status = 'active',
  updated_at = NOW()
WHERE email = 'estivenmendezr@gmail.com';