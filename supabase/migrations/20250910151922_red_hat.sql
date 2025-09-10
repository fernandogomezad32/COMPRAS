/*
  # Convertir estivenmendezr@gmail.com en Super Administrador

  1. Actualización de Usuario
    - Buscar usuario por email estivenmendezr@gmail.com
    - Actualizar rol a 'super_admin'
    - Asegurar estado 'active'

  2. Seguridad
    - Solo actualiza si el usuario existe
    - Mantiene otros datos intactos
*/

-- Actualizar el rol del usuario existente a super_admin
UPDATE user_profiles 
SET 
  role = 'super_admin',
  status = 'active',
  updated_at = now()
WHERE email = 'estivenmendezr@gmail.com';

-- Verificar que la actualización fue exitosa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE email = 'estivenmendezr@gmail.com' AND role = 'super_admin'
  ) THEN
    RAISE NOTICE 'Usuario estivenmendezr@gmail.com no encontrado o no se pudo actualizar';
  ELSE
    RAISE NOTICE 'Usuario estivenmendezr@gmail.com actualizado exitosamente a super_admin';
  END IF;
END $$;