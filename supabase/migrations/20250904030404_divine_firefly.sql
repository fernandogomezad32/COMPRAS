/*
  # Sistema de Ventas por Abonos

  1. Nuevas Tablas
    - `installment_sales`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key a customers)
      - `total_amount` (numeric, monto total de la venta)
      - `paid_amount` (numeric, monto ya pagado)
      - `remaining_amount` (numeric, monto pendiente)
      - `installment_type` (text, tipo: daily/weekly/monthly)
      - `installment_amount` (numeric, monto por abono)
      - `installment_count` (integer, número total de abonos)
      - `paid_installments` (integer, abonos ya pagados)
      - `start_date` (date, fecha de inicio)
      - `next_payment_date` (date, próxima fecha de pago)
      - `status` (text, estado: active/completed/overdue/cancelled)
      - `notes` (text, notas)
      - `created_by` (uuid, usuario que creó)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `installment_sale_items`
      - `id` (uuid, primary key)
      - `installment_sale_id` (uuid, foreign key)
      - `product_id` (uuid, foreign key a products)
      - `quantity` (integer, cantidad)
      - `unit_price` (numeric, precio unitario)
      - `total_price` (numeric, precio total)
      - `created_at` (timestamp)

    - `installment_payments`
      - `id` (uuid, primary key)
      - `installment_sale_id` (uuid, foreign key)
      - `payment_number` (integer, número de pago)
      - `amount` (numeric, monto del pago)
      - `payment_date` (date, fecha del pago)
      - `payment_method` (text, método de pago)
      - `notes` (text, notas)
      - `created_by` (uuid, usuario que registró)
      - `created_at` (timestamp)

  2. Seguridad
    - Habilitar RLS en todas las tablas
    - Políticas para usuarios autenticados
    - Restricciones de integridad

  3. Funciones y Triggers
    - Función para actualizar montos automáticamente
    - Función para calcular próxima fecha de pago
    - Triggers para mantener datos consistentes
*/

-- Crear tabla de ventas por abonos
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
  next_payment_date date NOT NULL,
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

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_installment_sales_customer_id ON installment_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_installment_sales_status ON installment_sales(status);
CREATE INDEX IF NOT EXISTS idx_installment_sales_next_payment_date ON installment_sales(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_installment_sales_created_by ON installment_sales(created_by);

CREATE INDEX IF NOT EXISTS idx_installment_sale_items_installment_sale_id ON installment_sale_items(installment_sale_id);
CREATE INDEX IF NOT EXISTS idx_installment_sale_items_product_id ON installment_sale_items(product_id);

CREATE INDEX IF NOT EXISTS idx_installment_payments_installment_sale_id ON installment_payments(installment_sale_id);
CREATE INDEX IF NOT EXISTS idx_installment_payments_payment_date ON installment_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_installment_payments_created_by ON installment_payments(created_by);

-- Habilitar RLS
ALTER TABLE installment_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_payments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para installment_sales
CREATE POLICY "Usuarios autenticados pueden leer ventas por abonos"
  ON installment_sales
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear ventas por abonos"
  ON installment_sales
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar ventas por abonos"
  ON installment_sales
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar ventas por abonos"
  ON installment_sales
  FOR DELETE
  TO authenticated
  USING (true);

-- Políticas RLS para installment_sale_items
CREATE POLICY "Usuarios autenticados pueden leer items de ventas por abonos"
  ON installment_sale_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear items de ventas por abonos"
  ON installment_sale_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar items de ventas por abonos"
  ON installment_sale_items
  FOR DELETE
  TO authenticated
  USING (true);

-- Políticas RLS para installment_payments
CREATE POLICY "Usuarios autenticados pueden leer pagos de abonos"
  ON installment_payments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear pagos de abonos"
  ON installment_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar pagos de abonos"
  ON installment_payments
  FOR DELETE
  TO authenticated
  USING (true);

-- Función para actualizar montos y estado de venta por abonos
CREATE OR REPLACE FUNCTION update_installment_sale_amounts()
RETURNS TRIGGER AS $$
DECLARE
  total_paid numeric;
  installment_sale_record installment_sales%ROWTYPE;
  next_payment_date date;
BEGIN
  -- Obtener el registro de la venta por abonos
  SELECT * INTO installment_sale_record
  FROM installment_sales
  WHERE id = NEW.installment_sale_id;

  -- Calcular total pagado
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM installment_payments
  WHERE installment_sale_id = NEW.installment_sale_id;

  -- Calcular número de abonos pagados
  DECLARE
    paid_count integer;
  BEGIN
    SELECT COUNT(*) INTO paid_count
    FROM installment_payments
    WHERE installment_sale_id = NEW.installment_sale_id;

    -- Calcular próxima fecha de pago
    IF paid_count < installment_sale_record.installment_count THEN
      CASE installment_sale_record.installment_type
        WHEN 'daily' THEN
          next_payment_date := installment_sale_record.start_date + (paid_count + 1);
        WHEN 'weekly' THEN
          next_payment_date := installment_sale_record.start_date + ((paid_count + 1) * 7);
        WHEN 'monthly' THEN
          next_payment_date := installment_sale_record.start_date + ((paid_count + 1) * INTERVAL '1 month');
      END CASE;
    ELSE
      next_payment_date := installment_sale_record.next_payment_date;
    END IF;

    -- Actualizar la venta por abonos
    UPDATE installment_sales
    SET 
      paid_amount = total_paid,
      remaining_amount = total_amount - total_paid,
      paid_installments = paid_count,
      next_payment_date = next_payment_date,
      status = CASE 
        WHEN total_paid >= total_amount THEN 'completed'
        WHEN next_payment_date < CURRENT_DATE AND status = 'active' THEN 'overdue'
        ELSE status
      END,
      updated_at = now()
    WHERE id = NEW.installment_sale_id;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para reducir stock al crear venta por abonos
CREATE OR REPLACE FUNCTION reduce_stock_on_installment_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Reducir stock del producto
  UPDATE products
  SET 
    stock_quantity = stock_quantity - NEW.quantity,
    updated_at = now()
  WHERE id = NEW.product_id;

  -- Verificar que el stock no sea negativo
  IF (SELECT stock_quantity FROM products WHERE id = NEW.product_id) < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente para el producto';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para restaurar stock al eliminar venta por abonos
CREATE OR REPLACE FUNCTION restore_stock_on_installment_sale_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Restaurar stock del producto
  UPDATE products
  SET 
    stock_quantity = stock_quantity + OLD.quantity,
    updated_at = now()
  WHERE id = OLD.product_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers
CREATE TRIGGER update_installment_sales_updated_at
  BEFORE UPDATE ON installment_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_installment_amounts_on_payment
  AFTER INSERT ON installment_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_installment_sale_amounts();

CREATE TRIGGER reduce_stock_on_installment_item_creation
  AFTER INSERT ON installment_sale_items
  FOR EACH ROW
  EXECUTE FUNCTION reduce_stock_on_installment_sale();

CREATE TRIGGER restore_stock_on_installment_item_deletion
  AFTER DELETE ON installment_sale_items
  FOR EACH ROW
  EXECUTE FUNCTION restore_stock_on_installment_sale_deletion();