/*
  # Fix User Profiles RLS Policy Infinite Recursion

  1. Problem Resolution
    - Drop existing recursive RLS policy on user_profiles table
    - Create new policy that uses JWT claims instead of database queries
    - This eliminates the infinite recursion error

  2. Security Changes
    - Users can read their own profile (auth.uid() = id)
    - Admins and super_admins can read all profiles (via JWT metadata)
    - No more circular dependencies in policy evaluation

  3. Performance Improvements
    - JWT-based role checking is faster than database queries
    - Reduces database load for role verification
*/

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "allow_profile_reads" ON public.user_profiles;

-- Create new policy that uses JWT claims to avoid recursion
CREATE POLICY "allow_profile_reads"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  -- Users can always read their own profile
  (auth.uid() = id) OR
  -- Admins and super_admins can read all profiles (using JWT metadata)
  (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin') OR
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin')
  )
);

-- Also update the update policy to use JWT claims
DROP POLICY IF EXISTS "allow_profile_updates" ON public.user_profiles;

CREATE POLICY "allow_profile_updates"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  -- Users can update their own profile
  (auth.uid() = id) OR
  -- Admins and super_admins can update all profiles (using JWT metadata)
  (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin') OR
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin')
  )
)
WITH CHECK (
  -- Same conditions for the WITH CHECK clause
  (auth.uid() = id) OR
  (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin') OR
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin')
  )
);

-- Update the insert policy to use JWT claims as well
DROP POLICY IF EXISTS "allow_user_profile_creation" ON public.user_profiles;

CREATE POLICY "allow_user_profile_creation"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Users can create their own profile
  (auth.uid() = id) OR
  -- Admins and super_admins can create profiles for others (using JWT metadata)
  (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin') OR
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin')
  )
);