/*
  # Crear Super Administrador Inicial

  Este script crea un super administrador inicial para el sistema.
  Solo se ejecuta si no existe ningún super administrador.

  1. Verificar si existe algún super administrador
  2. Si no existe, crear uno con credenciales por defecto
  3. El super administrador podrá crear otros usuarios
*/

-- Función para crear super administrador inicial
CREATE OR REPLACE FUNCTION create_initial_super_admin()
RETURNS void AS $$
DECLARE
  super_admin_count integer;
BEGIN
  -- Verificar si ya existe un super administrador
  SELECT COUNT(*) INTO super_admin_count
  FROM user_profiles
  WHERE role = 'super_admin' AND status = 'active';

  -- Si no existe ningún super administrador, crear uno
  IF super_admin_count = 0 THEN
    -- Insertar directamente en user_profiles
    -- En producción, esto debería hacerse manualmente por seguridad
    INSERT INTO user_profiles (
      id,
      email,
      full_name,
      role,
      status,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      'admin@ventaspro.com',
      'Super Administrador',
      'super_admin',
      'active',
      NULL,
      now(),
      now()
    );
    
    RAISE NOTICE 'Super administrador inicial creado con email: admin@ventaspro.com';
    RAISE NOTICE 'IMPORTANTE: Cambia las credenciales por defecto inmediatamente';
  ELSE
    RAISE NOTICE 'Ya existe un super administrador en el sistema';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la función
SELECT create_initial_super_admin();

-- Eliminar la función después de usarla
DROP FUNCTION create_initial_super_admin();