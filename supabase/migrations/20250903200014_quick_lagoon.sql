/*
  # Reorganize Database Backend Structure

  This migration reorganizes the database structure in the following order:
  1. Categories (categorías)
  2. Customers (clientes) 
  3. Products (productos)
  4. Suppliers (proveedores)
  5. Purchase Orders (compra_pedidos)
  6. Purchase Order Items (comprar_ordenar_artículos)
  7. Sales (ventas)
  8. Sale Items (venta_artículos)

  ## Changes Made:
  - Ensures proper table creation order respecting foreign key dependencies
  - Maintains all existing relationships and constraints
  - Adds comprehensive indexes for performance
  - Includes all RLS policies and triggers
  - Uses consistent naming and structure
*/

-- 1. CATEGORIES (categorías)
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer categorías"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear categorías"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar categorías"
  ON categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar categorías"
  ON categories FOR DELETE
  TO authenticated
  USING (true);

-- Indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- 2. CUSTOMERS (clientes)
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  phone text,
  address text,
  city text,
  postal_code text,
  tax_id text,
  customer_type text DEFAULT 'individual' CHECK (customer_type IN ('individual', 'business')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer clientes"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear clientes"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar clientes"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar clientes"
  ON customers FOR DELETE
  TO authenticated
  USING (true);

-- Indexes for customers
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type);

-- 3. SUPPLIERS (proveedores)
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

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer proveedores"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear proveedores"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar proveedores"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar proveedores"
  ON suppliers FOR DELETE
  TO authenticated
  USING (true);

-- Indexes for suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);

-- 4. PRODUCTS (productos)
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  cost numeric(10,2) DEFAULT 0,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_code text,
  stock_quantity integer DEFAULT 0,
  min_stock integer DEFAULT 5,
  barcode text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer productos"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear productos"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar productos"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar productos"
  ON products FOR DELETE
  TO authenticated
  USING (true);

-- Indexes for products
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- 5. PURCHASE ORDERS (compra_pedidos)
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

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer órdenes de compra"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear órdenes de compra"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar órdenes de compra"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar órdenes de compra"
  ON purchase_orders FOR DELETE
  TO authenticated
  USING (true);

-- Indexes for purchase orders
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON purchase_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_number ON purchase_orders(order_number);

-- 6. PURCHASE ORDER ITEMS (comprar_ordenar_artículos)
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  unit_cost numeric(10,2) NOT NULL DEFAULT 0,
  total_cost numeric(12,2) DEFAULT 0,
  received_quantity integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer items de órdenes de compra"
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear items de órdenes de compra"
  ON purchase_order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar items de órdenes de compra"
  ON purchase_order_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar items de órdenes de compra"
  ON purchase_order_items FOR DELETE
  TO authenticated
  USING (true);

-- Indexes for purchase order items
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order_id ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_id ON purchase_order_items(product_id);

-- 7. SALES (ventas)
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  total numeric(10,2) NOT NULL DEFAULT 0,
  subtotal numeric(10,2) DEFAULT 0,
  tax numeric(10,2) DEFAULT 0,
  customer_name text DEFAULT '',
  customer_email text DEFAULT '',
  payment_method text DEFAULT 'cash',
  status text DEFAULT 'completed',
  user_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden leer todas las ventas"
  ON sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios pueden crear ventas"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar ventas"
  ON sales FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden eliminar ventas"
  ON sales FOR DELETE
  TO authenticated
  USING (true);

-- Indexes for sales
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);

-- 8. SALE ITEMS (venta_artículos)
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  total_price numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden leer items de venta"
  ON sale_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios pueden crear items de venta"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar items de venta"
  ON sale_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios pueden eliminar items de venta"
  ON sale_items FOR DELETE
  TO authenticated
  USING (true);

-- Indexes for sale items
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- FUNCTIONS AND TRIGGERS

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number integer;
  order_prefix text := 'PO';
BEGIN
  -- Get the next order number
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 3) AS integer)), 0) + 1
  INTO next_number
  FROM purchase_orders
  WHERE order_number ~ '^PO[0-9]+$';
  
  -- Generate the order number
  NEW.order_number := order_prefix || LPAD(next_number::text, 6, '0');
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update product stock when items are received
CREATE OR REPLACE FUNCTION update_stock_on_receipt()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update stock if received_quantity changed and is greater than old value
  IF NEW.received_quantity > COALESCE(OLD.received_quantity, 0) THEN
    UPDATE products 
    SET stock_quantity = stock_quantity + (NEW.received_quantity - COALESCE(OLD.received_quantity, 0)),
        updated_at = now()
    WHERE id = NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update product stock after sales
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrease stock when sale item is created
  UPDATE products 
  SET stock_quantity = stock_quantity - NEW.quantity,
      updated_at = now()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- TRIGGERS

-- Updated_at triggers
CREATE TRIGGER IF NOT EXISTS update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Business logic triggers
CREATE TRIGGER IF NOT EXISTS generate_order_number_trigger
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();

CREATE TRIGGER IF NOT EXISTS update_stock_on_receipt_trigger
  AFTER UPDATE OF received_quantity ON purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_receipt();

CREATE TRIGGER IF NOT EXISTS update_stock_after_sale
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock();

-- SAMPLE DATA (Optional - for testing)

-- Insert sample categories
INSERT INTO categories (name, description) VALUES
  ('Electrónicos', 'Dispositivos y componentes electrónicos'),
  ('Ropa', 'Prendas de vestir y accesorios'),
  ('Hogar', 'Artículos para el hogar y decoración'),
  ('Deportes', 'Equipamiento y ropa deportiva')
ON CONFLICT (name) DO NOTHING;

-- Insert sample suppliers
INSERT INTO suppliers (name, contact_person, email, phone, payment_terms, status) VALUES
  ('TechSupply Corp', 'Juan Pérez', 'juan@techsupply.com', '+52-555-0001', 'net_30', 'active'),
  ('Fashion Wholesale', 'María García', 'maria@fashionwholesale.com', '+52-555-0002', 'net_15', 'active'),
  ('Home & Garden Ltd', 'Carlos López', 'carlos@homeandgarden.com', '+52-555-0003', 'net_45', 'active')
ON CONFLICT DO NOTHING;