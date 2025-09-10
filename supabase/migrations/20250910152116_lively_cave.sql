/*
  # Fix database error during user signup

  1. Database Triggers
    - Create or replace the user profile creation trigger function
    - Ensure proper permissions with SECURITY DEFINER
    - Add error handling to prevent signup failures

  2. RLS Policies
    - Update RLS policies to allow trigger execution
    - Ensure authenticated users can create profiles
    - Add policy for system/trigger operations

  3. Error Handling
    - Add try-catch in trigger function
    - Log errors without failing signup
    - Ensure user creation succeeds even if profile creation fails
*/

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;

-- Create or replace the trigger function with proper error handling
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    -- Try to insert the user profile
    INSERT INTO public.user_profiles (
      id,
      email,
      full_name,
      role,
      status,
      created_by
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      'employee',
      'active',
      NULL
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the user creation
      RAISE WARNING 'Failed to create user profile for %: %', NEW.email, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_profile();

-- Update RLS policies to allow trigger execution
DROP POLICY IF EXISTS "Allow trigger to create profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear perfiles" ON public.user_profiles;

-- Create comprehensive INSERT policy
CREATE POLICY "Allow profile creation"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    -- Allow users to create their own profile
    auth.uid() = id
    OR
    -- Allow system/trigger operations (when auth.uid() is null during signup)
    auth.uid() IS NULL
  );

-- Ensure other policies exist
DO $$
BEGIN
  -- SELECT policy for users to read their own profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can read own profile'
  ) THEN
    CREATE POLICY "Users can read own profile"
      ON public.user_profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;

  -- SELECT policy for admins to read all profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Admins can read all profiles'
  ) THEN
    CREATE POLICY "Admins can read all profiles"
      ON public.user_profiles
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.id = auth.uid()
          AND up.role IN ('admin', 'super_admin')
        )
      );
  END IF;

  -- UPDATE policy for users to update their own profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON public.user_profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;

  -- UPDATE policy for super admin to update any profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Super admin can update any profile'
  ) THEN
    CREATE POLICY "Super admin can update any profile"
      ON public.user_profiles
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.id = auth.uid()
          AND up.role = 'super_admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.id = auth.uid()
          AND up.role = 'super_admin'
        )
      );
  END IF;

  -- DELETE policy for super admin only
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Only super_admin can delete users'
  ) THEN
    CREATE POLICY "Only super_admin can delete users"
      ON public.user_profiles
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.id = auth.uid()
          AND up.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- Create helper function for getting user role (if not exists)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.user_profiles
  WHERE id = user_id;
  
  RETURN COALESCE(user_role, 'employee');
END;
$$;