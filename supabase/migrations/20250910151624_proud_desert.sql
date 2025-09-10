/*
  # Crear usuario super administrador

  1. Nuevo Usuario
    - Email: estiven@gmail.com
    - Contraseña: admin123
    - Rol: super_admin
    - Estado: activo

  2. Seguridad
    - Usuario creado directamente en auth.users
    - Perfil creado en user_profiles
    - Rol de super administrador asignado
*/

-- Crear usuario en auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'estiven@gmail.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Estiven Admin"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Crear perfil de usuario super admin
INSERT INTO user_profiles (
  id,
  email,
  full_name,
  role,
  status,
  created_by,
  created_at,
  updated_at
)
SELECT 
  u.id,
  'estiven@gmail.com',
  'Estiven Admin',
  'super_admin',
  'active',
  NULL,
  NOW(),
  NOW()
FROM auth.users u 
WHERE u.email = 'estiven@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  status = 'active',
  updated_at = NOW();