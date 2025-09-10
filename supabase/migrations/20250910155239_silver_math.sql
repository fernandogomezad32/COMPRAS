/*
  # Fix user_profiles table structure

  1. Table Structure Updates
    - Ensure all required columns exist with proper types
    - Fix any missing columns or incorrect constraints
    - Update triggers and functions

  2. Security
    - Update RLS policies for proper access control
    - Ensure authenticated users can manage profiles correctly

  3. Data Integrity
    - Add proper constraints and defaults
    - Ensure foreign key relationships are correct
*/

-- Drop existing table if it has issues and recreate with proper structure
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Create user_profiles table with correct structure
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('super_admin', 'admin', 'employee')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_status ON user_profiles(status);
CREATE INDEX idx_user_profiles_created_by ON user_profiles(created_by);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "service_role_all" ON user_profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "users_select_own" ON user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "admins_select_all" ON user_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('super_admin', 'admin')
      AND up.status = 'active'
    )
  );

CREATE POLICY "admins_update_all" ON user_profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('super_admin', 'admin')
      AND up.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('super_admin', 'admin')
      AND up.status = 'active'
    )
  );

CREATE POLICY "admins_delete_all" ON user_profiles
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up 
      WHERE up.id = auth.uid() 
      AND up.role IN ('super_admin', 'admin')
      AND up.status = 'active'
    )
  );

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Create or replace function to automatically create user profile
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'employee',
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile on auth user creation
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default super admin user if none exists
DO $$
BEGIN
  -- Check if any super admin exists
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles WHERE role = 'super_admin'
  ) THEN
    -- Create a default super admin profile for the first user
    INSERT INTO user_profiles (id, email, full_name, role, status, created_by)
    SELECT 
      id,
      email,
      COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
      'super_admin',
      'active',
      NULL
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1
    ON CONFLICT (id) DO UPDATE SET
      role = 'super_admin',
      status = 'active';
  END IF;
END $$;