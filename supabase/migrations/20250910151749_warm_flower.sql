/*
  # Crear usuario super admin en Supabase Auth

  1. Funciones
    - Función para crear usuario en auth.users
    - Función para crear perfil de usuario
  
  2. Ejecución
    - Crear usuario estiven@gmail.com con contraseña admin123
    - Crear perfil con rol super_admin
    - Confirmar email automáticamente
*/

-- Función para crear usuario super admin
CREATE OR REPLACE FUNCTION create_super_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  encrypted_pw text;
BEGIN
  -- Generar ID único para el usuario
  user_id := gen_random_uuid();
  
  -- Encriptar la contraseña usando crypt
  encrypted_pw := crypt('admin123', gen_salt('bf'));
  
  -- Insertar en auth.users si no existe
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    role,
    aud,
    confirmation_token,
    email_change_token_new,
    recovery_token
  )
  SELECT 
    user_id,
    '00000000-0000-0000-0000-000000000000',
    'estiven@gmail.com',
    encrypted_pw,
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '',
    ''
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'estiven@gmail.com'
  );
  
  -- Crear perfil de usuario si no existe
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    role,
    status,
    created_at,
    updated_at
  )
  SELECT 
    user_id,
    'estiven@gmail.com',
    'Estiven Super Admin',
    'super_admin',
    'active',
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE email = 'estiven@gmail.com'
  );
  
  RAISE NOTICE 'Super admin user created successfully with email: estiven@gmail.com';
END;
$$;

-- Ejecutar la función para crear el usuario
SELECT create_super_admin_user();

-- Eliminar la función después de usarla
DROP FUNCTION create_super_admin_user();