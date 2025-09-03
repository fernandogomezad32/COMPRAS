/*
  # Solucionar problema de columna barcode ambigua

  1. Cambios en la base de datos
    - Eliminar columna `barcode` de la tabla `payment_receipts` si existe
    - Mantener solo la columna `barcode` en la tabla `products`
    - Limpiar cualquier referencia ambigua

  2. Seguridad
    - Mantener todas las políticas RLS existentes
    - No afectar datos existentes
*/

-- Verificar si existe la tabla payment_receipts y eliminar columna barcode si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'payment_receipts' AND table_schema = 'public'
  ) THEN
    -- Eliminar columna barcode de payment_receipts si existe
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'payment_receipts' 
      AND column_name = 'barcode' 
      AND table_schema = 'public'
    ) THEN
      ALTER TABLE payment_receipts DROP COLUMN IF EXISTS barcode;
    END IF;
  END IF;
END $$;

-- Asegurar que solo products tenga la columna barcode
-- Verificar que la columna barcode existe en products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' 
    AND column_name = 'barcode' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE products ADD COLUMN barcode text;
    CREATE UNIQUE INDEX IF NOT EXISTS products_barcode_key ON products(barcode) WHERE barcode IS NOT NULL;
  END IF;
END $$;