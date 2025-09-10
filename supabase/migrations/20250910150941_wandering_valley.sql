/*
  # Fix user system and resolve conflicts

  1. Database Functions
    - Create helper functions for user role management
    - Add functions to check user permissions
    - Create trigger function for user profile updates

  2. Security Updates
    - Update RLS policies for user_profiles table
    - Add proper permission checks
    - Ensure data consistency

  3. User Profile Management
    - Fix user profile creation workflow
    - Add proper constraints and validations
    - Update trigger functions
*/

-- Create function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM user_profiles 
    WHERE id = user_id
  );
END;
$$;

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT role = 'super_admin'
    FROM user_profiles 
    WHERE id = user_id
  );
END;
$$;

-- Create function to check if user is admin or super admin
CREATE OR REPLACE FUNCTION is_admin_or_super(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT role IN ('admin', 'super_admin')
    FROM user_profiles 
    WHERE id = user_id
  );
END;
$$;

-- Create or replace the user profile update trigger function
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- Create function to automatically create user profile
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'employee',
    'active'
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, do nothing
    RETURN NEW;
END;
$$;

-- Create trigger to auto-create user profiles
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Update RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Only super_admin can create users" ON user_profiles;
DROP POLICY IF EXISTS "Only super_admin can update users" ON user_profiles;
DROP POLICY IF EXISTS "Only super_admin can delete users" ON user_profiles;

-- New RLS policies
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin', 'super_admin'));

CREATE POLICY "Only super_admin can create users"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Only super_admin can update users"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Only super_admin can delete users"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Ensure there's at least one super admin (update existing user if needed)
DO $$
BEGIN
  -- Check if there are any super admins
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE role = 'super_admin') THEN
    -- If no super admin exists, promote the first user to super admin
    UPDATE user_profiles 
    SET role = 'super_admin', updated_at = now()
    WHERE id = (
      SELECT id FROM user_profiles 
      ORDER BY created_at ASC 
      LIMIT 1
    );
  END IF;
END $$;