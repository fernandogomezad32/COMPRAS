/*
  # Fix RLS policies for user_profiles table

  1. Security Updates
    - Drop existing restrictive INSERT policy
    - Create new policy allowing admins and super_admins to create user profiles
    - Maintain existing policies for SELECT and UPDATE operations
    - Ensure service_role maintains full access

  2. Changes Made
    - Removed `allow_own_profile_insert` policy that only allowed self-insertion
    - Added `allow_admin_create_users` policy for admin user creation
    - Updated policy to check if current user has admin or super_admin role
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "allow_own_profile_insert" ON public.user_profiles;

-- Create new policy that allows admins and super_admins to create user profiles
CREATE POLICY "allow_admin_create_users"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if the current user is admin or super_admin
    EXISTS (
      SELECT 1 
      FROM public.user_profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'super_admin')
    )
    OR
    -- Allow users to create their own profile (for initial setup)
    auth.uid() = id
  );

-- Ensure the policy for reading all profiles exists (needed for role checking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'allow_authenticated_read_all'
  ) THEN
    CREATE POLICY "allow_authenticated_read_all"
      ON public.user_profiles
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;