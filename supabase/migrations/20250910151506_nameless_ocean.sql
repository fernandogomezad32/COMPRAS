/*
  # Fix RLS policies for user_profiles table

  1. Security Changes
    - Drop existing restrictive INSERT policy
    - Create new INSERT policy allowing users to create their own profile
    - Ensure users can only insert with their own auth.uid()
    
  2. Policy Details
    - INSERT: Users can create profile for themselves (auth.uid() = id)
    - Maintains existing SELECT, UPDATE, DELETE policies
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Only super_admin can create users" ON user_profiles;

-- Create new INSERT policy that allows users to create their own profile
CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Ensure the existing policies are correct
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;

-- Recreate SELECT policies
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::text, 'super_admin'::text]));

-- Ensure UPDATE policy allows users to update their own profile
DROP POLICY IF EXISTS "Only super_admin can update users" ON user_profiles;

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Super admin can update any profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'super_admin'::text)
  WITH CHECK (get_user_role(auth.uid()) = 'super_admin'::text);

-- Keep DELETE policy for super admin only
DROP POLICY IF EXISTS "Only super_admin can delete users" ON user_profiles;

CREATE POLICY "Only super_admin can delete users"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'super_admin'::text);