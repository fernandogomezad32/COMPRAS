/*
  # Fix infinite recursion in user_profiles RLS policies

  1. Security Changes
    - Disable RLS temporarily to clear all policies
    - Remove all existing policies that cause recursion
    - Create simple, non-recursive policies
    - Re-enable RLS with safe policies

  2. Policy Strategy
    - Users can read/update their own profile (auth.uid() = id)
    - All authenticated users can read profiles (for admin functionality)
    - No subqueries or recursive checks
    - Service role has full access
*/

-- Disable RLS temporarily to clear all policies
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role full access" ON user_profiles;
DROP POLICY IF EXISTS "authenticated_users_can_read_all_profiles" ON user_profiles;
DROP POLICY IF EXISTS "service_role_full_access" ON user_profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_can_read_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON user_profiles;

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
CREATE POLICY "allow_own_profile_read"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "allow_own_profile_update"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_own_profile_insert"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_authenticated_read_all"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_service_role_all"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);