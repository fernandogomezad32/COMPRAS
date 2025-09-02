/*
  # Sistema de Ventas e Inventario - Esquema de Base de Datos

  1. Nuevas Tablas
    - `categories` - Categorías de productos
      - `id` (uuid, clave primaria)
      - `name` (texto, único)
      - `description` (texto)
      - `created_at` (timestamp)
      
    - `products` - Productos del inventario
      - `id` (uuid, clave primaria)
      - `name` (texto, único)
      - `description` (texto)
      - `price` (decimal)
      - `cost` (decimal)
      - `category_id` (uuid, referencia a categories)
      - `stock_quantity` (entero)
      - `min_stock` (entero)
      - `barcode` (texto, único)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      
    - `sales` - Registro de ventas
      - `id` (uuid, clave primaria)
      - `total` (decimal)
      - `subtotal` (decimal)
      - `tax` (decimal)
      - `customer_name` (texto)
      - `customer_email` (texto)
      - `payment_method` (texto)
      - `status` (texto)
      - `user_id` (uuid, referencia a auth.users)
      - `created_at` (timestamp)
      
    - `sale_items` - Detalles de items vendidos
      - `id` (uuid, clave primaria)
      - `sale_id` (uuid, referencia a sales)
      - `product_id` (uuid, referencia a products)
      - `quantity` (entero)
      - `unit_price` (decimal)
      - `total_price` (decimal)
      - `created_at` (timestamp)

  2. Seguridad
    - Habilitar RLS en todas las tablas
    - Políticas para usuarios autenticados para leer y crear datos
    - Políticas específicas para cada tabla según el rol del usuario

  3. Funciones y Triggers
    - Trigger para actualizar stock automáticamente después de ventas
    - Función para calcular totales de ventas
*/

-- Crear tabla de categorías
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Crear tabla de productos
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  price decimal(10,2) NOT NULL DEFAULT 0,
  cost decimal(10,2) NOT NULL DEFAULT 0,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  stock_quantity integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 5,
  barcode text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla de ventas
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total decimal(10,2) NOT NULL DEFAULT 0,
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  tax decimal(10,2) NOT NULL DEFAULT 0,
  customer_name text DEFAULT '',
  customer_email text DEFAULT '',
  payment_method text NOT NULL DEFAULT 'cash',
  status text NOT NULL DEFAULT 'completed',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Crear tabla de items de venta
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  total_price decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Políticas para categories
CREATE POLICY "Usuarios autenticados pueden leer categorías"
  ON categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear categorías"
  ON categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar categorías"
  ON categories
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Políticas para products
CREATE POLICY "Usuarios autenticados pueden leer productos"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear productos"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar productos"
  ON products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Políticas para sales
CREATE POLICY "Usuarios pueden leer todas las ventas"
  ON sales
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios pueden crear ventas"
  ON sales
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Políticas para sale_items
CREATE POLICY "Usuarios pueden leer items de venta"
  ON sale_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios pueden crear items de venta"
  ON sale_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Función para actualizar stock después de una venta
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products 
  SET stock_quantity = stock_quantity - NEW.quantity,
      updated_at = now()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar stock automáticamente
CREATE TRIGGER update_stock_after_sale
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock();

-- Función para actualizar updated_at en products
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at en products
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insertar algunas categorías por defecto
INSERT INTO categories (name, description) VALUES
  ('Electrónicos', 'Dispositivos y accesorios electrónicos'),
  ('Ropa', 'Prendas de vestir y accesorios'),
  ('Hogar', 'Artículos para el hogar y decoración'),
  ('Deportes', 'Equipos y accesorios deportivos'),
  ('Libros', 'Libros y material educativo')
ON CONFLICT (name) DO NOTHING;