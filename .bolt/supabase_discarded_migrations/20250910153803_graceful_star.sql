/*
  # Create Fernando Employee User

  1. New User Creation
    - Creates user fernando@gmail.com in auth.users
    - Password: empleado123
    - Email confirmed automatically
    - Role: employee

  2. User Profile
    - Creates corresponding profile in user_profiles
    - Full name: Fernando García
    - Role: employee
    - Status: active

  3. Security
    - Password encrypted with bcrypt
    - Handles conflicts if user already exists
    - Proper error handling
*/

-- Create user in auth.users with encrypted password
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'fernando@gmail.com',
  crypt('empleado123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Fernando García"}',
  false,
  'authenticated'
)
ON CONFLICT (email) DO NOTHING;

-- Create user profile
INSERT INTO public.user_profiles (
  id,
  email,
  full_name,
  role,
  status,
  created_at,
  updated_at
)
SELECT 
  au.id,
  'fernando@gmail.com',
  'Fernando García',
  'employee',
  'active',
  now(),
  now()
FROM auth.users au 
WHERE au.email = 'fernando@gmail.com'
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = now();