/*
  # Solucionar problema de columna barcode ambigua

  1. Verificación y limpieza
    - Verificar que solo la tabla products tenga columna barcode
    - Eliminar cualquier columna barcode de otras tablas si existe
    - Limpiar índices relacionados

  2. Seguridad
    - Operaciones seguras con IF EXISTS
    - No afecta datos existentes
*/

-- Verificar y eliminar columna barcode de sales si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE sales DROP COLUMN barcode;
  END IF;
END $$;

-- Verificar y eliminar columna barcode de customers si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE customers DROP COLUMN barcode;
  END IF;
END $$;

-- Verificar y eliminar columna barcode de suppliers si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE suppliers DROP COLUMN barcode;
  END IF;
END $$;

-- Verificar y eliminar columna barcode de categories si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE categories DROP COLUMN barcode;
  END IF;
END $$;

-- Verificar y eliminar columna barcode de sale_items si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sale_items' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE sale_items DROP COLUMN barcode;
  END IF;
END $$;

-- Asegurar que solo products tenga la columna barcode
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE products ADD COLUMN barcode text;
    CREATE UNIQUE INDEX IF NOT EXISTS products_barcode_key ON products(barcode) WHERE barcode IS NOT NULL;
  END IF;
END $$;