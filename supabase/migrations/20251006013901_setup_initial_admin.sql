/*
  # Crear función para configuración inicial de administrador

  1. Propósito
    - Crear una función que permita crear el usuario administrador inicial
    - Esta función debe ser llamada manualmente o desde la aplicación
  
  2. Uso
    - Después de aplicar esta migración, crear el usuario usando:
      - Supabase Dashboard > Authentication > Users > Create User
      - O usar el Admin API desde la aplicación
*/

-- Crear función helper para asegurar que un usuario tenga perfil
CREATE OR REPLACE FUNCTION ensure_user_profile_exists(
  user_id uuid,
  user_email text,
  user_full_name text DEFAULT 'Usuario',
  user_role text DEFAULT 'cashier'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_profiles (
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    user_email,
    user_full_name,
    user_role,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW();
END;
$$;

-- Crear trigger para crear perfil automáticamente cuando se crea un usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_profiles (
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'cashier'),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Crear trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();