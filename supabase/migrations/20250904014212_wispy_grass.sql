/*
  # Sistema de Devoluciones y Garantías

  1. Nueva Tabla
    - `returns`
      - `id` (uuid, primary key)
      - `sale_id` (uuid, referencia a sales)
      - `sale_item_id` (uuid, referencia a sale_items)
      - `product_id` (uuid, referencia a products)
      - `customer_id` (uuid, referencia a customers)
      - `quantity_returned` (integer, cantidad devuelta)
      - `reason` (text, motivo de devolución)
      - `return_type` (text, tipo: refund, exchange, warranty)
      - `condition` (text, condición del producto)
      - `refund_amount` (numeric, monto reembolsado)
      - `status` (text, estado de la devolución)
      - `processed_by` (uuid, usuario que procesó)
      - `notes` (text, notas adicionales)
      - `return_date` (timestamp, fecha de devolución)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Seguridad
    - Enable RLS en `returns` table
    - Políticas para usuarios autenticados

  3. Funciones
    - Trigger para actualizar stock en devoluciones
    - Función para procesar reembolsos automáticos
*/

-- Crear tabla de devoluciones
CREATE TABLE IF NOT EXISTS returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL,
  sale_item_id uuid NOT NULL,
  product_id uuid NOT NULL,
  customer_id uuid,
  quantity_returned integer NOT NULL DEFAULT 1,
  reason text NOT NULL DEFAULT '',
  return_type text NOT NULL DEFAULT 'refund',
  condition text NOT NULL DEFAULT 'good',
  refund_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  processed_by uuid,
  notes text DEFAULT '',
  return_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT returns_quantity_returned_check CHECK (quantity_returned > 0),
  CONSTRAINT returns_refund_amount_check CHECK (refund_amount >= 0),
  CONSTRAINT returns_return_type_check CHECK (return_type = ANY (ARRAY['refund'::text, 'exchange'::text, 'warranty'::text])),
  CONSTRAINT returns_condition_check CHECK (condition = ANY (ARRAY['excellent'::text, 'good'::text, 'fair'::text, 'poor'::text, 'damaged'::text])),
  CONSTRAINT returns_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'completed'::text, 'cancelled'::text]))
);

-- Foreign Keys
ALTER TABLE returns 
ADD CONSTRAINT returns_sale_id_fkey 
FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE;

ALTER TABLE returns 
ADD CONSTRAINT returns_sale_item_id_fkey 
FOREIGN KEY (sale_item_id) REFERENCES sale_items(id) ON DELETE CASCADE;

ALTER TABLE returns 
ADD CONSTRAINT returns_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

ALTER TABLE returns 
ADD CONSTRAINT returns_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE returns 
ADD CONSTRAINT returns_processed_by_fkey 
FOREIGN KEY (processed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_returns_sale_id ON returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_returns_product_id ON returns(product_id);
CREATE INDEX IF NOT EXISTS idx_returns_customer_id ON returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_return_type ON returns(return_type);
CREATE INDEX IF NOT EXISTS idx_returns_return_date ON returns(return_date);
CREATE INDEX IF NOT EXISTS idx_returns_processed_by ON returns(processed_by);

-- Enable RLS
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Usuarios autenticados pueden leer devoluciones"
  ON returns
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear devoluciones"
  ON returns
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar devoluciones"
  ON returns
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar devoluciones"
  ON returns
  FOR DELETE
  TO authenticated
  USING (true);

-- Función para actualizar stock en devoluciones
CREATE OR REPLACE FUNCTION handle_return_stock_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la devolución es aprobada y completada, restaurar stock
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Solo restaurar stock si es refund o warranty (no exchange)
    IF NEW.return_type IN ('refund', 'warranty') THEN
      UPDATE products 
      SET stock_quantity = stock_quantity + NEW.quantity_returned,
          updated_at = now()
      WHERE id = NEW.product_id;
    END IF;
  END IF;
  
  -- Si se cancela una devolución que estaba completada, quitar stock
  IF NEW.status = 'cancelled' AND OLD.status = 'completed' THEN
    IF NEW.return_type IN ('refund', 'warranty') THEN
      UPDATE products 
      SET stock_quantity = stock_quantity - NEW.quantity_returned,
          updated_at = now()
      WHERE id = NEW.product_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para manejar stock en devoluciones
CREATE TRIGGER handle_return_stock_trigger
  AFTER UPDATE ON returns
  FOR EACH ROW
  EXECUTE FUNCTION handle_return_stock_update();

-- Función para updated_at automático
CREATE TRIGGER update_returns_updated_at
  BEFORE UPDATE ON returns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();