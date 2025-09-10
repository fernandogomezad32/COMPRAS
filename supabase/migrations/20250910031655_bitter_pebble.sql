/*
  # Sistema de Gestión de Usuarios con Roles

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text)
      - `role` (text: super_admin, admin, employee)
      - `status` (text: active, inactive)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `user_profiles` table
    - Add policies for role-based access control
    - Only super_admin can create users
    - Users can read their own profile
    - Admins and super_admins can read all profiles

  3. Functions
    - Function to check user role
    - Function to create initial super admin
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'employee',
  status text NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraints
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('super_admin', 'admin', 'employee'));

ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_status_check 
CHECK (status IN ('active', 'inactive'));

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM user_profiles 
    WHERE id = user_id AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT role = 'super_admin' 
    FROM user_profiles 
    WHERE id = user_id AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Admins and super_admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

-- Only super_admin can insert new users
CREATE POLICY "Only super_admin can create users"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid())
  );

-- Only super_admin can update user profiles
CREATE POLICY "Only super_admin can update users"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    is_super_admin(auth.uid())
  )
  WITH CHECK (
    is_super_admin(auth.uid())
  );

-- Only super_admin can delete users
CREATE POLICY "Only super_admin can delete users"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (
    is_super_admin(auth.uid())
  );

-- Function to create user profile after auth signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS trigger AS $$
BEGIN
  -- Only create profile if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = NEW.id) THEN
    INSERT INTO user_profiles (id, email, full_name, role, created_by)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
      COALESCE((NEW.raw_user_meta_data->>'created_by')::uuid, NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile after user signup
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_by ON user_profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);