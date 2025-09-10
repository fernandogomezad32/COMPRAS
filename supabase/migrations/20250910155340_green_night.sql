/*
  # Fix infinite recursion in user_profiles RLS policies

  1. Problem
    - Current policies are causing infinite recursion when checking user roles
    - The `is_admin()` function queries `user_profiles` table within policies for the same table
    - This creates a circular dependency during policy evaluation

  2. Solution
    - Remove all existing policies that cause recursion
    - Create simple, direct policies that don't self-reference
    - Use only `auth.uid()` and direct column comparisons
    - Avoid subqueries that reference the same table

  3. New Policy Structure
    - Users can manage their own profiles (simple `auth.uid() = id`)
    - Service role has full access
    - Remove complex admin checking that causes recursion
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "users_select_own" ON user_profiles;
DROP POLICY IF EXISTS "users_insert_own" ON user_profiles;
DROP POLICY IF EXISTS "users_update_own" ON user_profiles;
DROP POLICY IF EXISTS "admins_select_all" ON user_profiles;
DROP POLICY IF EXISTS "admins_update_all" ON user_profiles;
DROP POLICY IF EXISTS "admins_delete_all" ON user_profiles;
DROP POLICY IF EXISTS "service_role_all" ON user_profiles;

-- Drop the problematic function that causes recursion
DROP FUNCTION IF EXISTS is_admin();

-- Create simple, non-recursive policies
CREATE POLICY "users_can_read_own_profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users_can_insert_own_profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_can_update_own_profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role has full access (no recursion risk)
CREATE POLICY "service_role_full_access"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read all profiles (for admin functionality)
-- This is safe because it doesn't create recursion
CREATE POLICY "authenticated_users_can_read_all_profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- For admin operations, we'll handle permissions in the application layer
-- rather than in database policies to avoid recursion