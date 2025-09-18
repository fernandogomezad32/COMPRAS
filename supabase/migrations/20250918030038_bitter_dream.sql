/*
  # Improve user profiles RLS policies

  1. Policy Updates
    - Update INSERT policy to allow admins and super_admins to create user profiles
    - Update existing policies to handle edge cases better
    - Ensure proper role-based access control

  2. Security
    - Maintain RLS on user_profiles table
    - Allow admins to create new user profiles
    - Allow users to read their own profiles and other profiles (for admin functions)
    - Allow users to update their own profiles
    - Allow admins to update any profile
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "allow_admin_create_users" ON user_profiles;

-- Create a more comprehensive INSERT policy
CREATE POLICY "allow_user_profile_creation"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow users to create their own profile (for initial registration)
    (auth.uid() = id) OR
    -- Allow admins and super_admins to create any user profile
    (EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'super_admin')
    ))
  );

-- Update the UPDATE policy to be more permissive for admins
DROP POLICY IF EXISTS "allow_own_profile_update" ON user_profiles;

CREATE POLICY "allow_profile_updates"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow users to update their own profile
    (auth.uid() = id) OR
    -- Allow admins and super_admins to update any profile
    (EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'super_admin')
    ))
  )
  WITH CHECK (
    -- Same conditions for the updated data
    (auth.uid() = id) OR
    (EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'super_admin')
    ))
  );

-- Ensure the SELECT policy allows reading profiles for admin functions
DROP POLICY IF EXISTS "allow_authenticated_read_all" ON user_profiles;
DROP POLICY IF EXISTS "allow_own_profile_read" ON user_profiles;

CREATE POLICY "allow_profile_reads"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Allow users to read their own profile
    (auth.uid() = id) OR
    -- Allow admins and super_admins to read all profiles
    (EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'super_admin')
    )) OR
    -- Allow employees to read basic profile info (for user lists, etc.)
    (EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'employee'
    ))
  );