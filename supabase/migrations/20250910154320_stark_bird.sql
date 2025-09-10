/*
  # Fix infinite recursion in user_profiles RLS policies

  1. Problem
    - Infinite recursion detected in RLS policies for user_profiles table
    - Policies are referencing user_profiles table within their own conditions
    - This creates a circular dependency causing 500 errors

  2. Solution
    - Drop all existing problematic policies
    - Create simple, non-recursive policies using only auth.uid()
    - Avoid subqueries that reference user_profiles table within policies

  3. New Policies
    - Simple SELECT policy: users can read their own profile
    - Simple INSERT policy: users can create their own profile
    - Simple UPDATE policy: users can update their own profile
    - Admin policies: separate policies for admin operations
*/

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for service role" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admin can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Only super_admin can delete users" ON user_profiles;

-- Create simple, non-recursive policies
CREATE POLICY "users_select_own" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role policy for system operations
CREATE POLICY "service_role_all" ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create a simple function to check if user is admin (without recursion)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
  );
$$;

-- Admin policies using the safe function
CREATE POLICY "admins_select_all" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "admins_update_all" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admins_delete_all" ON user_profiles
  FOR DELETE
  TO authenticated
  USING (is_admin());