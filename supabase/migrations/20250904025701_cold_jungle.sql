/*
  # Sistema de Ventas por Abonos

  1. Nuevas Tablas
    - `installment_sales`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key to customers)
      - `total_amount` (numeric, monto total de la venta)
      - `paid_amount` (numeric, monto ya pagado)
      - `remaining_amount` (numeric, monto pendiente)
      - `installment_type` (text, 'daily' o 'monthly')
      - `installment_amount` (numeric, monto de cada abono)
      - `installment_count` (integer, número total de abonos)
      - `paid_installments` (integer, abonos ya pagados)
      - `start_date` (date, fecha de inicio)
      - `next_payment_date` (date, próxima fecha de pago)
      - `status` (text, estado del abono)
      - `notes` (text, notas adicionales)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `installment_payments`
      - `id` (uuid, primary key)
      - `installment_sale_id` (uuid, foreign key)
      - `payment_number` (integer, número del abono)
      - `amount` (numeric, monto del pago)
      - `payment_date` (date, fecha del pago)
      - `payment_method` (text, método de pago)
      - `notes` (text, notas del pago)
      - `created_at` (timestamp)

    - `installment_sale_items`
      - `id` (uuid, primary key)
      - `installment_sale_id` (uuid, foreign key)
      - `product_id` (uuid, foreign key to products)
      - `quantity` (integer, cantidad)
      - `unit_price` (numeric, precio unitario)
      - `total_price` (numeric, precio total)
      - `created_at` (timestamp)

  2. Seguridad
    - Enable RLS en todas las tablas
    - Políticas para usuarios autenticados
    - Restricciones de integridad

  3. Funciones
    - Función para calcular próxima fecha de pago
    - Trigger para actualizar montos automáticamente
*/

-- Crear tabla de ventas por abonos
CREATE TABLE IF NOT EXISTS installment_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  remaining_amount numeric(12,2) NOT NULL DEFAULT 0,
  installment_type text NOT NULL DEFAULT 'monthly',
  installment_amount numeric(10,2) NOT NULL DEFAULT 0,
  installment_count integer NOT NULL DEFAULT 1,
  paid_installments integer NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  next_payment_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active',
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT installment_sales_installment_type_check 
    CHECK (installment_type IN ('daily', 'weekly', 'monthly')),
  CONSTRAINT installment_sales_status_check 
    CHECK (status IN ('active', 'completed', 'cancelled', 'overdue')),
  CONSTRAINT installment_sales_amounts_check 
    CHECK (total_amount >= 0 AND paid_amount >= 0 AND remaining_amount >= 0),
  CONSTRAINT installment_sales_installments_check 
    CHECK (installment_count > 0 AND paid_installments >= 0 AND paid_installments <= installment_count),
  CONSTRAINT installment_sales_installment_amount_check 
    CHECK (installment_amount > 0)
);

-- Crear tabla de pagos de abonos
CREATE TABLE IF NOT EXISTS installment_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_sale_id uuid NOT NULL REFERENCES installment_sales(id) ON DELETE CASCADE,
  payment_number integer NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'cash',
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT installment_payments_amount_check CHECK (amount > 0),
  CONSTRAINT installment_payments_payment_number_check CHECK (payment_number > 0),
  CONSTRAINT installment_payments_payment_method_check 
    CHECK (payment_method IN ('cash', 'card', 'transfer', 'nequi', 'daviplata', 'bancolombia')),
  UNIQUE(installment_sale_id, payment_number)
);

-- Crear tabla de items de ventas por abonos
CREATE TABLE IF NOT EXISTS installment_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_sale_id uuid NOT NULL REFERENCES installment_sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  total_price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT installment_sale_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT installment_sale_items_prices_check 
    CHECK (unit_price >= 0 AND total_price >= 0)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_installment_sales_customer_id ON installment_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_installment_sales_status ON installment_sales(status);
CREATE INDEX IF NOT EXISTS idx_installment_sales_next_payment_date ON installment_sales(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_installment_sales_created_at ON installment_sales(created_at);

CREATE INDEX IF NOT EXISTS idx_installment_payments_installment_sale_id ON installment_payments(installment_sale_id);
CREATE INDEX IF NOT EXISTS idx_installment_payments_payment_date ON installment_payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_installment_sale_items_installment_sale_id ON installment_sale_items(installment_sale_id);
CREATE INDEX IF NOT EXISTS idx_installment_sale_items_product_id ON installment_sale_items(product_id);

-- Habilitar RLS
ALTER TABLE installment_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_sale_items ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para installment_sales
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

-- Políticas de seguridad para installment_payments
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

CREATE POLICY "Usuarios autenticados pueden actualizar pagos de abonos"
  ON installment_payments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar pagos de abonos"
  ON installment_payments
  FOR DELETE
  TO authenticated
  USING (true);

-- Políticas de seguridad para installment_sale_items
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

CREATE POLICY "Usuarios autenticados pueden actualizar items de ventas por abonos"
  ON installment_sale_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar items de ventas por abonos"
  ON installment_sale_items
  FOR DELETE
  TO authenticated
  USING (true);

-- Función para calcular la próxima fecha de pago
CREATE OR REPLACE FUNCTION calculate_next_payment_date(
  current_date date,
  installment_type text
) RETURNS date AS $$
BEGIN
  CASE installment_type
    WHEN 'daily' THEN
      RETURN current_date + INTERVAL '1 day';
    WHEN 'weekly' THEN
      RETURN current_date + INTERVAL '1 week';
    WHEN 'monthly' THEN
      RETURN current_date + INTERVAL '1 month';
    ELSE
      RETURN current_date + INTERVAL '1 month';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar montos automáticamente
CREATE OR REPLACE FUNCTION update_installment_amounts() RETURNS TRIGGER AS $$
BEGIN
  -- Calcular monto pagado total
  NEW.paid_amount := (
    SELECT COALESCE(SUM(amount), 0)
    FROM installment_payments
    WHERE installment_sale_id = NEW.id
  );
  
  -- Calcular monto restante
  NEW.remaining_amount := NEW.total_amount - NEW.paid_amount;
  
  -- Contar pagos realizados
  NEW.paid_installments := (
    SELECT COUNT(*)
    FROM installment_payments
    WHERE installment_sale_id = NEW.id
  );
  
  -- Actualizar estado
  IF NEW.remaining_amount <= 0 THEN
    NEW.status := 'completed';
  ELSIF NEW.next_payment_date < CURRENT_DATE AND NEW.remaining_amount > 0 THEN
    NEW.status := 'overdue';
  ELSE
    NEW.status := 'active';
  END IF;
  
  -- Actualizar timestamp
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar después de un pago
CREATE OR REPLACE FUNCTION update_installment_after_payment() RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar la venta por abonos
  UPDATE installment_sales 
  SET 
    paid_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM installment_payments
      WHERE installment_sale_id = NEW.installment_sale_id
    ),
    paid_installments = (
      SELECT COUNT(*)
      FROM installment_payments
      WHERE installment_sale_id = NEW.installment_sale_id
    ),
    next_payment_date = calculate_next_payment_date(
      NEW.payment_date,
      (SELECT installment_type FROM installment_sales WHERE id = NEW.installment_sale_id)
    ),
    updated_at = now()
  WHERE id = NEW.installment_sale_id;
  
  -- Actualizar remaining_amount y status
  UPDATE installment_sales 
  SET 
    remaining_amount = total_amount - paid_amount,
    status = CASE 
      WHEN total_amount - paid_amount <= 0 THEN 'completed'
      WHEN next_payment_date < CURRENT_DATE AND total_amount - paid_amount > 0 THEN 'overdue'
      ELSE 'active'
    END
  WHERE id = NEW.installment_sale_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar stock cuando se crea una venta por abonos
CREATE OR REPLACE FUNCTION update_stock_installment_sale() RETURNS TRIGGER AS $$
BEGIN
  -- Reducir stock del producto
  UPDATE products 
  SET 
    stock_quantity = stock_quantity - NEW.quantity,
    updated_at = now()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para restaurar stock cuando se elimina una venta por abonos
CREATE OR REPLACE FUNCTION restore_stock_installment_sale() RETURNS TRIGGER AS $$
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

-- Triggers
CREATE TRIGGER update_installment_amounts_trigger
  BEFORE UPDATE ON installment_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_installment_amounts();

CREATE TRIGGER update_installment_after_payment_trigger
  AFTER INSERT ON installment_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_installment_after_payment();

CREATE TRIGGER update_stock_installment_sale_trigger
  AFTER INSERT ON installment_sale_items
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_installment_sale();

CREATE TRIGGER restore_stock_installment_sale_trigger
  AFTER DELETE ON installment_sale_items
  FOR EACH ROW
  EXECUTE FUNCTION restore_stock_installment_sale();