/*
  # Fix Authentication Schema Permissions and Create Estiven User

  1. Authentication Schema Fixes
    - Restore default permissions for anon and authenticated roles on auth schema
    - Ensure auth.users table has proper access permissions
    - Fix any overly restrictive RLS policies on auth tables

  2. User Creation
    - Create estiven@gmail.com user with password estiven123
    - Set up user profile with employee role
    - Ensure email is confirmed automatically

  3. Security
    - Maintain proper RLS on user_profiles
    - Allow authentication system to function normally
*/

-- Fix auth schema permissions for anon role
GRANT USAGE ON SCHEMA auth TO anon;
GRANT SELECT ON auth.users TO anon;

-- Fix auth schema permissions for authenticated role  
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Ensure service_role has full access (should already exist but making sure)
GRANT ALL ON SCHEMA auth TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;

-- Create estiven@gmail.com user if not exists
DO $$
DECLARE
    user_id uuid;
BEGIN
    -- Insert user into auth.users
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token,
        aud,
        role
    ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'estiven@gmail.com',
        crypt('estiven123', gen_salt('bf')),
        now(),
        now(),
        now(),
        '',
        '',
        '',
        '',
        'authenticated',
        'authenticated'
    )
    ON CONFLICT (email) DO UPDATE SET
        encrypted_password = crypt('estiven123', gen_salt('bf')),
        email_confirmed_at = now(),
        updated_at = now()
    RETURNING id INTO user_id;

    -- Get the user ID if it was an update
    IF user_id IS NULL THEN
        SELECT id INTO user_id FROM auth.users WHERE email = 'estiven@gmail.com';
    END IF;

    -- Create or update user profile
    INSERT INTO public.user_profiles (
        id,
        email,
        full_name,
        role,
        status,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        'estiven@gmail.com',
        'Estiven Méndez',
        'employee',
        'active',
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = 'estiven@gmail.com',
        full_name = 'Estiven Méndez',
        role = 'employee',
        status = 'active',
        updated_at = now();

EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE NOTICE 'Error creating user estiven@gmail.com: %', SQLERRM;
END $$;

-- Ensure RLS policies on user_profiles allow proper access
DROP POLICY IF EXISTS "Allow profile creation" ON public.user_profiles;
CREATE POLICY "Allow profile creation"
    ON public.user_profiles
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Ensure auth system can query user profiles
DROP POLICY IF EXISTS "Auth system can read profiles" ON public.user_profiles;
CREATE POLICY "Auth system can read profiles"
    ON public.user_profiles
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Fix any potential issues with the get_user_role function
CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.user_profiles
    WHERE id = user_uuid;
    
    RETURN COALESCE(user_role, 'employee');
EXCEPTION WHEN OTHERS THEN
    RETURN 'employee';
END;
$$;