/*
  # Sistema de comprobantes de pago

  1. Nueva tabla
    - `payment_receipts`
      - `id` (uuid, primary key)
      - `sale_id` (uuid, foreign key to sales)
      - `receipt_number` (text, unique) - Número secuencial del comprobante
      - `barcode` (text, unique) - Código de barras generado
      - `receipt_type` (text) - Tipo de comprobante (sale, refund, etc.)
      - `status` (text) - Estado del comprobante (active, cancelled, voided)
      - `issued_at` (timestamp) - Fecha de emisión
      - `voided_at` (timestamp) - Fecha de anulación (si aplica)
      - `void_reason` (text) - Razón de anulación
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Función para generar número de comprobante
    - Genera números secuenciales únicos
    - Formato: YYYY-NNNNNN (año + número secuencial)

  3. Función para generar código de barras
    - Basado en el ID del comprobante y timestamp
    - Formato único y escaneable

  4. Trigger automático
    - Genera comprobante automáticamente al crear una venta

  5. Seguridad
    - Enable RLS en payment_receipts
    - Políticas para usuarios autenticados
*/

-- Crear tabla de comprobantes de pago
CREATE TABLE IF NOT EXISTS payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  receipt_number text UNIQUE NOT NULL,
  barcode text UNIQUE NOT NULL,
  receipt_type text DEFAULT 'sale' NOT NULL,
  status text DEFAULT 'active' NOT NULL,
  issued_at timestamptz DEFAULT now(),
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

-- Crear políticas de seguridad
CREATE POLICY "Usuarios autenticados pueden leer comprobantes"
  ON payment_receipts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear comprobantes"
  ON payment_receipts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar comprobantes"
  ON payment_receipts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Agregar constraints
ALTER TABLE payment_receipts 
ADD CONSTRAINT payment_receipts_receipt_type_check 
CHECK (receipt_type IN ('sale', 'refund', 'exchange', 'credit_note'));

ALTER TABLE payment_receipts 
ADD CONSTRAINT payment_receipts_status_check 
CHECK (status IN ('active', 'cancelled', 'voided'));

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_payment_receipts_sale_id ON payment_receipts(sale_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_receipt_number ON payment_receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_barcode ON payment_receipts(barcode);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_issued_at ON payment_receipts(issued_at);

-- Función para generar número de comprobante secuencial
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS text AS $$
DECLARE
  current_year text;
  next_number integer;
  receipt_number text;
BEGIN
  -- Obtener el año actual
  current_year := EXTRACT(YEAR FROM NOW())::text;
  
  -- Obtener el siguiente número secuencial para este año
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN receipt_number LIKE current_year || '-%' 
        THEN (SPLIT_PART(receipt_number, '-', 2))::integer 
        ELSE 0 
      END
    ) + 1, 
    1
  )
  INTO next_number
  FROM payment_receipts;
  
  -- Formatear el número de comprobante: YYYY-NNNNNN
  receipt_number := current_year || '-' || LPAD(next_number::text, 6, '0');
  
  RETURN receipt_number;
END;
$$ LANGUAGE plpgsql;

-- Función para generar código de barras único
CREATE OR REPLACE FUNCTION generate_barcode(receipt_id uuid)
RETURNS text AS $$
DECLARE
  timestamp_part text;
  id_part text;
  barcode text;
BEGIN
  -- Usar timestamp en formato compacto
  timestamp_part := EXTRACT(EPOCH FROM NOW())::bigint::text;
  
  -- Usar parte del UUID (primeros 8 caracteres sin guiones)
  id_part := REPLACE(SUBSTRING(receipt_id::text, 1, 8), '-', '');
  
  -- Combinar para crear código de barras único
  barcode := '2' || timestamp_part || id_part;
  
  -- Asegurar que sea único
  WHILE EXISTS (SELECT 1 FROM payment_receipts WHERE barcode = barcode) LOOP
    barcode := barcode || FLOOR(RANDOM() * 10)::text;
  END LOOP;
  
  RETURN barcode;
END;
$$ LANGUAGE plpgsql;

-- Función para crear comprobante automáticamente
CREATE OR REPLACE FUNCTION create_payment_receipt()
RETURNS TRIGGER AS $$
DECLARE
  new_receipt_number text;
  new_barcode text;
  receipt_id uuid;
BEGIN
  -- Solo crear comprobante para ventas completadas
  IF NEW.status = 'completed' THEN
    -- Generar ID para el comprobante
    receipt_id := gen_random_uuid();
    
    -- Generar número de comprobante
    new_receipt_number := generate_receipt_number();
    
    -- Generar código de barras
    new_barcode := generate_barcode(receipt_id);
    
    -- Insertar el comprobante
    INSERT INTO payment_receipts (
      id,
      sale_id,
      receipt_number,
      barcode,
      receipt_type,
      status,
      issued_at
    ) VALUES (
      receipt_id,
      NEW.id,
      new_receipt_number,
      new_barcode,
      'sale',
      'active',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para generar comprobante automáticamente
DROP TRIGGER IF EXISTS create_receipt_after_sale ON sales;
CREATE TRIGGER create_receipt_after_sale
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION create_payment_receipt();

-- Función para actualizar updated_at en payment_receipts
CREATE OR REPLACE FUNCTION update_payment_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_payment_receipts_updated_at
  BEFORE UPDATE ON payment_receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_receipts_updated_at();