/*
  # Schema completo del sistema de ventas
  
  Incluye todas las tablas necesarias con el campo next_payment_date como NULLABLE
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

-- Crear tabla de proveedores
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  contact_name text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Crear tabla de clientes
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  address text DEFAULT '',
  identification text UNIQUE,
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

-- Crear tabla de ventas por abonos (NEXT_PAYMENT_DATE ES NULLABLE)
CREATE TABLE IF NOT EXISTS installment_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  total_amount numeric(12,2) NOT NULL CHECK (total_amount > 0),
  paid_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  remaining_amount numeric(12,2) NOT NULL CHECK (remaining_amount >= 0),
  installment_type text NOT NULL CHECK (installment_type IN ('daily', 'weekly', 'monthly')),
  installment_amount numeric(12,2) NOT NULL CHECK (installment_amount > 0),
  installment_count integer NOT NULL CHECK (installment_count >= 2 AND installment_count <= 60),
  paid_installments integer NOT NULL DEFAULT 0 CHECK (paid_installments >= 0),
  start_date date NOT NULL,
  next_payment_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue', 'cancelled')),
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla de items de ventas por abonos
CREATE TABLE IF NOT EXISTS installment_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_sale_id uuid NOT NULL REFERENCES installment_sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price numeric(10,2) NOT NULL CHECK (total_price >= 0),
  created_at timestamptz DEFAULT now()
);

-- Crear tabla de pagos de abonos
CREATE TABLE IF NOT EXISTS installment_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_sale_id uuid NOT NULL REFERENCES installment_sales(id) ON DELETE CASCADE,
  payment_number integer NOT NULL CHECK (payment_number > 0),
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer', 'nequi', 'daviplata', 'bancolombia')),
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Crear tabla de devoluciones
CREATE TABLE IF NOT EXISTS returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  reason text NOT NULL,
  total_amount numeric(10,2) NOT NULL CHECK (total_amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla de items de devoluciones
CREATE TABLE IF NOT EXISTS return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price numeric(10,2) NOT NULL CHECK (total_price >= 0),
  created_at timestamptz DEFAULT now()
);

-- Crear tabla de configuración de facturación
CREATE TABLE IF NOT EXISTS invoice_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  business_address text DEFAULT '',
  business_phone text DEFAULT '',
  business_email text DEFAULT '',
  tax_id text DEFAULT '',
  logo_url text DEFAULT '',
  invoice_prefix text DEFAULT 'INV',
  next_invoice_number integer NOT NULL DEFAULT 1,
  footer_text text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text DEFAULT '',
  role text NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'manager', 'cashier')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_installment_sales_customer_id ON installment_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_installment_sales_status ON installment_sales(status);
CREATE INDEX IF NOT EXISTS idx_installment_sales_next_payment_date ON installment_sales(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_installment_sale_items_installment_sale_id ON installment_sale_items(installment_sale_id);
CREATE INDEX IF NOT EXISTS idx_installment_payments_installment_sale_id ON installment_payments(installment_sale_id);
CREATE INDEX IF NOT EXISTS idx_returns_sale_id ON returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON return_items(return_id);

-- Habilitar RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (permitir acceso a usuarios autenticados)
CREATE POLICY "auth_read_categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_categories" ON categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_categories" ON categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_categories" ON categories FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_read_products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_products" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_products" ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_products" ON products FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_read_suppliers" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_suppliers" ON suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_suppliers" ON suppliers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_suppliers" ON suppliers FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_read_customers" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_customers" ON customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_customers" ON customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_customers" ON customers FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_read_sales" ON sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sales" ON sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_sales" ON sales FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_sales" ON sales FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_read_sale_items" ON sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sale_items" ON sale_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_delete_sale_items" ON sale_items FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_read_installment_sales" ON installment_sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_installment_sales" ON installment_sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_installment_sales" ON installment_sales FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_installment_sales" ON installment_sales FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_read_installment_sale_items" ON installment_sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_installment_sale_items" ON installment_sale_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_delete_installment_sale_items" ON installment_sale_items FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_read_installment_payments" ON installment_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_installment_payments" ON installment_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_delete_installment_payments" ON installment_payments FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_read_returns" ON returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_returns" ON returns FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_returns" ON returns FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_returns" ON returns FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_read_return_items" ON return_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_return_items" ON return_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_delete_return_items" ON return_items FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_read_invoice_config" ON invoice_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_invoice_config" ON invoice_config FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_invoice_config" ON invoice_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_read_user_profiles" ON user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_user_profiles" ON user_profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_user_profiles" ON user_profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Funciones auxiliares
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_installment_sales_updated_at BEFORE UPDATE ON installment_sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_returns_updated_at BEFORE UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoice_config_updated_at BEFORE UPDATE ON invoice_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE TRIGGER update_stock_after_sale AFTER INSERT ON sale_items FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- Función para reducir stock en ventas por abonos
CREATE OR REPLACE FUNCTION reduce_stock_on_installment_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock_quantity = stock_quantity - NEW.quantity,
      updated_at = now()
  WHERE id = NEW.product_id;
  
  IF (SELECT stock_quantity FROM products WHERE id = NEW.product_id) < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente para el producto';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reduce_stock_on_installment_item_creation AFTER INSERT ON installment_sale_items FOR EACH ROW EXECUTE FUNCTION reduce_stock_on_installment_sale();

-- Función para restaurar stock
CREATE OR REPLACE FUNCTION restore_stock_on_return()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock_quantity = stock_quantity + NEW.quantity,
      updated_at = now()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER restore_stock_after_return AFTER INSERT ON return_items FOR EACH ROW EXECUTE FUNCTION restore_stock_on_return();

-- Función para actualizar montos de ventas por abonos
CREATE OR REPLACE FUNCTION update_installment_sale_amounts()
RETURNS TRIGGER AS $$
DECLARE
  total_paid numeric;
  installment_sale_record installment_sales%ROWTYPE;
  next_due_date date;
  paid_count integer;
BEGIN
  SELECT * INTO installment_sale_record
  FROM installment_sales
  WHERE id = NEW.installment_sale_id;
  
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM installment_payments
  WHERE installment_sale_id = NEW.installment_sale_id;
  
  SELECT COUNT(*) INTO paid_count
  FROM installment_payments
  WHERE installment_sale_id = NEW.installment_sale_id;
  
  IF paid_count < installment_sale_record.installment_count THEN
    CASE installment_sale_record.installment_type
      WHEN 'daily' THEN
        next_due_date := installment_sale_record.start_date + (paid_count + 1);
      WHEN 'weekly' THEN
        next_due_date := installment_sale_record.start_date + ((paid_count + 1) * 7);
      WHEN 'monthly' THEN
        next_due_date := installment_sale_record.start_date + ((paid_count + 1) * INTERVAL '1 month');
    END CASE;
  ELSE
    next_due_date := NULL;
  END IF;
  
  UPDATE installment_sales
  SET 
    paid_amount = total_paid,
    remaining_amount = total_amount - total_paid,
    paid_installments = paid_count,
    next_payment_date = next_due_date,
    status = CASE 
      WHEN total_paid >= total_amount THEN 'completed'
      WHEN next_due_date IS NOT NULL AND next_due_date < CURRENT_DATE AND status = 'active' THEN 'overdue'
      ELSE status
    END,
    updated_at = now()
  WHERE id = NEW.installment_sale_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_installment_amounts_on_payment AFTER INSERT ON installment_payments FOR EACH ROW EXECUTE FUNCTION update_installment_sale_amounts();

-- Insertar categorías por defecto
INSERT INTO categories (name, description) VALUES
  ('Electrónicos', 'Dispositivos y accesorios electrónicos'),
  ('Ropa', 'Prendas de vestir y accesorios'),
  ('Hogar', 'Artículos para el hogar y decoración'),
  ('Deportes', 'Equipos y accesorios deportivos'),
  ('Libros', 'Libros y material educativo')
ON CONFLICT (name) DO NOTHING;