/*
  # Fix Authentication and User Profiles RLS Policies

  1. Authentication Fixes
    - Grant necessary permissions to anon and authenticated roles for auth schema
    - Fix database schema access issues
    - Ensure proper authentication flow

  2. User Profiles RLS Policies
    - Allow authenticated users to insert their own profiles
    - Fix RLS policy violations during user creation
    - Enable proper profile creation during signup

  3. Security
    - Maintain security while allowing legitimate operations
    - Fix policy conflicts that prevent user registration
*/

-- Grant necessary permissions for authentication to work
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT SELECT ON auth.users TO anon, authenticated;

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Allow profile creation" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admin can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Only super_admin can delete users" ON user_profiles;

-- Create comprehensive RLS policies for user_profiles
CREATE POLICY "Enable insert for authenticated users" ON user_profiles
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable insert for service role" ON user_profiles
  FOR INSERT 
  TO service_role 
  WITH CHECK (true);

CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" ON user_profiles
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Super admin can update any profile" ON user_profiles
  FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Only super_admin can delete users" ON user_profiles
  FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Ensure the get_user_role function exists and works properly
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = user_id;
  
  RETURN COALESCE(user_role, 'employee');
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'employee';
END;
$$;

-- Create the user creation trigger function
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    role,
    status
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'employee',
    'active'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Create estiven@gmail.com user if it doesn't exist
DO $$
DECLARE
  user_id uuid;
  encrypted_pw text;
BEGIN
  -- Generate a UUID for the user
  user_id := gen_random_uuid();
  
  -- Create encrypted password (this is a simplified version)
  encrypted_pw := crypt('estiven123', gen_salt('bf'));
  
  -- Insert into auth.users if not exists
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
    role,
    aud,
    confirmation_token,
    email_change_token_new,
    recovery_token
  ) VALUES (
    user_id,
    '00000000-0000-0000-0000-000000000000',
    'estiven@gmail.com',
    encrypted_pw,
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Estiven Méndez"}',
    false,
    'authenticated',
    'authenticated',
    '',
    '',
    ''
  ) ON CONFLICT (email) DO NOTHING;
  
  -- Get the user ID (in case it already existed)
  SELECT id INTO user_id FROM auth.users WHERE email = 'estiven@gmail.com';
  
  -- Insert into user_profiles if not exists
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    role,
    status,
    created_by
  ) VALUES (
    user_id,
    'estiven@gmail.com',
    'Estiven Méndez',
    'employee',
    'active',
    NULL
  ) ON CONFLICT (id) DO NOTHING;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating estiven user: %', SQLERRM;
END $$;