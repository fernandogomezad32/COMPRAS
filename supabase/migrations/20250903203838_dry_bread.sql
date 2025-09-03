/*
  # Corregir eliminación de productos

  1. Políticas RLS
    - Agregar política DELETE para productos
    - Verificar políticas existentes

  2. Restricciones de clave foránea
    - Revisar y ajustar restricciones para permitir eliminación segura
*/

-- Agregar política DELETE para productos si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' 
    AND policyname = 'Usuarios autenticados pueden eliminar productos'
  ) THEN
    CREATE POLICY "Usuarios autenticados pueden eliminar productos"
      ON products
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Verificar y corregir restricciones de clave foránea en sale_items
-- Cambiar a CASCADE para permitir eliminación
DO $$
BEGIN
  -- Eliminar restricción existente si existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sale_items_product_id_fkey'
    AND table_name = 'sale_items'
  ) THEN
    ALTER TABLE sale_items DROP CONSTRAINT sale_items_product_id_fkey;
  END IF;

  -- Recrear con SET NULL en lugar de CASCADE para mantener historial
  ALTER TABLE sale_items 
  ADD CONSTRAINT sale_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
END $$;

-- Verificar y corregir restricciones en purchase_order_items
DO $$
BEGIN
  -- Eliminar restricción existente si existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'purchase_order_items_product_id_fkey'
    AND table_name = 'purchase_order_items'
  ) THEN
    ALTER TABLE purchase_order_items DROP CONSTRAINT purchase_order_items_product_id_fkey;
  END IF;

  -- Recrear con SET NULL
  ALTER TABLE purchase_order_items 
  ADD CONSTRAINT purchase_order_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
END $$;

-- Agregar índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_id ON purchase_order_items(product_id);