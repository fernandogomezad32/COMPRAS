/*
  # Sistema de Proveedores

  1. Nuevas Tablas
    - `suppliers` (proveedores)
      - `id` (uuid, primary key)
      - `name` (text, nombre del proveedor)
      - `contact_person` (text, persona de contacto)
      - `email` (text, correo electrónico)
      - `phone` (text, teléfono)
      - `address` (text, dirección)
      - `city` (text, ciudad)
      - `postal_code` (text, código postal)
      - `tax_id` (text, RFC/ID fiscal)
      - `payment_terms` (text, términos de pago)
      - `credit_limit` (numeric, límite de crédito)
      - `status` (text, estado activo/inactivo)
      - `notes` (text, notas adicionales)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `purchase_orders` (órdenes de compra)
      - `id` (uuid, primary key)
      - `supplier_id` (uuid, referencia al proveedor)
      - `order_number` (text, número de orden)
      - `status` (text, estado de la orden)
      - `order_date` (date, fecha de orden)
      - `expected_delivery` (date, fecha esperada de entrega)
      - `subtotal` (numeric, subtotal)
      - `tax` (numeric, impuestos)
      - `total` (numeric, total)
      - `notes` (text, notas)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `purchase_order_items` (items de órdenes de compra)
      - `id` (uuid, primary key)
      - `purchase_order_id` (uuid, referencia a orden de compra)
      - `product_id` (uuid, referencia al producto)
      - `quantity` (integer, cantidad ordenada)
      - `unit_cost` (numeric, costo unitario)
      - `total_cost` (numeric, costo total)
      - `received_quantity` (integer, cantidad recibida)
      - `created_at` (timestamp)

  2. Modificaciones a Tablas Existentes
    - `products`: agregar `supplier_id` para relacionar productos con proveedores
    - `products`: agregar `supplier_code` para código del proveedor

  3. Seguridad
    - Habilitar RLS en todas las nuevas tablas
    - Agregar políticas para usuarios autenticados
    - Políticas de lectura, creación, actualización para proveedores
    - Políticas de lectura, creación, actualización para órdenes de compra

  4. Funciones y Triggers
    - Trigger para actualizar `updated_at` en suppliers
    - Trigger para actualizar `updated_at` en purchase_orders
    - Función para actualizar stock cuando se reciben productos
*/

-- Crear tabla de proveedores
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text DEFAULT '',
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  tax_id text,
  payment_terms text DEFAULT 'net_30',
  credit_limit numeric(12,2) DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla de órdenes de compra
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  order_number text UNIQUE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  order_date date DEFAULT CURRENT_DATE,
  expected_delivery date,
  subtotal numeric(12,2) DEFAULT 0,
  tax numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla de items de órdenes de compra
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  unit_cost numeric(10,2) NOT NULL DEFAULT 0,
  total_cost numeric(12,2) NOT NULL DEFAULT 0,
  received_quantity integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Agregar columnas a la tabla products para relacionar con proveedores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'supplier_id'
  ) THEN
    ALTER TABLE products ADD COLUMN supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'supplier_code'
  ) THEN
    ALTER TABLE products ADD COLUMN supplier_code text;
  END IF;
END $$;

-- Habilitar RLS en las nuevas tablas
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Políticas para suppliers
CREATE POLICY "Usuarios autenticados pueden leer proveedores"
  ON suppliers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear proveedores"
  ON suppliers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar proveedores"
  ON suppliers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar proveedores"
  ON suppliers
  FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para purchase_orders
CREATE POLICY "Usuarios autenticados pueden leer órdenes de compra"
  ON purchase_orders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear órdenes de compra"
  ON purchase_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar órdenes de compra"
  ON purchase_orders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar órdenes de compra"
  ON purchase_orders
  FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para purchase_order_items
CREATE POLICY "Usuarios autenticados pueden leer items de órdenes de compra"
  ON purchase_order_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear items de órdenes de compra"
  ON purchase_order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar items de órdenes de compra"
  ON purchase_order_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar items de órdenes de compra"
  ON purchase_order_items
  FOR DELETE
  TO authenticated
  USING (true);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar stock cuando se reciben productos
CREATE OR REPLACE FUNCTION update_stock_on_receipt()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar stock del producto cuando se actualiza received_quantity
  IF NEW.received_quantity > OLD.received_quantity THEN
    UPDATE products 
    SET stock_quantity = stock_quantity + (NEW.received_quantity - OLD.received_quantity),
        updated_at = now()
    WHERE id = NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar stock automáticamente
CREATE TRIGGER update_stock_on_receipt_trigger
  AFTER UPDATE OF received_quantity ON purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_receipt();

-- Función para generar número de orden automático
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'PO-' || TO_CHAR(NEW.created_at, 'YYYYMMDD') || '-' || 
                       LPAD(EXTRACT(EPOCH FROM NEW.created_at)::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para generar número de orden automáticamente
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON purchase_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order_id ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_id ON purchase_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);