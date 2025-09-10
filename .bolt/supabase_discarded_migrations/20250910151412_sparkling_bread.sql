/*
  # Fix User Profiles RLS Policies

  1. Security Updates
    - Drop existing restrictive policies
    - Add proper INSERT policy for user profile creation
    - Allow users to create their own profiles
    - Maintain security for other operations

  2. Changes
    - Enable users to insert their own profile during registration
    - Keep existing read/update/delete policies secure
    - Fix the RLS violation error
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Only super_admin can create users" ON user_profiles;

-- Create a new INSERT policy that allows users to create their own profile
CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Ensure the existing policies are correct
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Keep admin policies for management
CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::text, 'super_admin'::text]));

-- Update policy allows users to update their own profile
DROP POLICY IF EXISTS "Only super_admin can update users" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Super admin can update any profile
CREATE POLICY "Super admin can update any profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'super_admin'::text)
  WITH CHECK (get_user_role(auth.uid()) = 'super_admin'::text);

-- Delete policy - only super admin can delete
DROP POLICY IF EXISTS "Only super_admin can delete users" ON user_profiles;
CREATE POLICY "Super admin can delete users"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'super_admin'::text);