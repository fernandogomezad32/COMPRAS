/*
  # Completely Fix User Profiles RLS Recursion

  1. Security Changes
    - Drop ALL existing policies that cause recursion
    - Create simple, non-recursive policies
    - Use only auth.uid() without subqueries
    - Ensure service_role has full access

  2. Policy Structure
    - Simple INSERT policy for authenticated users
    - Simple SELECT policy for own data
    - Simple UPDATE policy for own data
    - Admin policies using direct auth checks
*/

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "users_select_own" ON user_profiles;
DROP POLICY IF EXISTS "users_insert_own" ON user_profiles;
DROP POLICY IF EXISTS "users_update_own" ON user_profiles;
DROP POLICY IF EXISTS "admins_select_all" ON user_profiles;
DROP POLICY IF EXISTS "admins_update_all" ON user_profiles;
DROP POLICY IF EXISTS "admins_delete_all" ON user_profiles;
DROP POLICY IF EXISTS "service_role_all" ON user_profiles;

-- Ensure RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
CREATE POLICY "allow_insert_own_profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_select_own_profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "allow_update_own_profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role has full access (no recursion possible)
CREATE POLICY "service_role_full_access"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin policies using auth metadata (no table recursion)
CREATE POLICY "admin_select_all"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt() ->> 'user_metadata' ->> 'role'),
      'employee'
    ) IN ('super_admin', 'admin')
  );

CREATE POLICY "admin_update_all"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt() ->> 'user_metadata' ->> 'role'),
      'employee'
    ) IN ('super_admin', 'admin')
  )
  WITH CHECK (
    COALESCE(
      (auth.jwt() ->> 'user_metadata' ->> 'role'),
      'employee'
    ) IN ('super_admin', 'admin')
  );

CREATE POLICY "admin_delete_all"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt() ->> 'user_metadata' ->> 'role'),
      'employee'
    ) IN ('super_admin', 'admin')
  );