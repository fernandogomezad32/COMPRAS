/*
  # Agregar código de barras de factura a ventas

  1. Nuevas Columnas
    - `invoice_number` (text, único) - Número de factura secuencial
    - `invoice_barcode` (text, único) - Código de barras único para la factura
    - `invoice_generated_at` (timestamp) - Fecha de generación de factura

  2. Funciones
    - `generate_invoice_number()` - Genera números de factura secuenciales
    - `generate_invoice_barcode()` - Genera códigos de barras únicos

  3. Triggers
    - Genera automáticamente número y código de barras al crear venta

  4. Índices
    - Índices para búsqueda rápida por número y código de barras
*/

-- Función para generar número de factura secuencial
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  invoice_num TEXT;
BEGIN
  -- Obtener el siguiente número secuencial
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '^INV-(\d+)$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM sales
  WHERE invoice_number IS NOT NULL;
  
  -- Formatear como INV-000001
  invoice_num := 'INV-' || LPAD(next_number::TEXT, 6, '0');
  
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Función para generar código de barras único
CREATE OR REPLACE FUNCTION generate_invoice_barcode()
RETURNS TEXT AS $$
DECLARE
  barcode TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generar código de 12 dígitos: año(4) + mes(2) + día(2) + random(4)
    barcode := TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Verificar que no exista
    SELECT COUNT(*) INTO exists_check
    FROM sales
    WHERE invoice_barcode = barcode;
    
    -- Si no existe, salir del loop
    IF exists_check = 0 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN barcode;
END;
$$ LANGUAGE plpgsql;

-- Agregar columnas a la tabla sales
DO $$
BEGIN
  -- Agregar invoice_number si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'invoice_number'
  ) THEN
    ALTER TABLE sales ADD COLUMN invoice_number TEXT UNIQUE;
  END IF;

  -- Agregar invoice_barcode si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'invoice_barcode'
  ) THEN
    ALTER TABLE sales ADD COLUMN invoice_barcode TEXT UNIQUE;
  END IF;

  -- Agregar invoice_generated_at si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'invoice_generated_at'
  ) THEN
    ALTER TABLE sales ADD COLUMN invoice_generated_at TIMESTAMPTZ;
  END IF;
END $$;

-- Crear índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_barcode ON sales(invoice_barcode);

-- Función trigger para generar automáticamente número y código de barras
CREATE OR REPLACE FUNCTION generate_invoice_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo generar si no existe ya
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  
  IF NEW.invoice_barcode IS NULL THEN
    NEW.invoice_barcode := generate_invoice_barcode();
  END IF;
  
  IF NEW.invoice_generated_at IS NULL THEN
    NEW.invoice_generated_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para generar datos de factura automáticamente
DROP TRIGGER IF EXISTS generate_invoice_data_trigger ON sales;
CREATE TRIGGER generate_invoice_data_trigger
  BEFORE INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_data();

-- Generar números y códigos para ventas existentes que no los tengan
UPDATE sales 
SET 
  invoice_number = generate_invoice_number(),
  invoice_barcode = generate_invoice_barcode(),
  invoice_generated_at = created_at
WHERE invoice_number IS NULL OR invoice_barcode IS NULL;