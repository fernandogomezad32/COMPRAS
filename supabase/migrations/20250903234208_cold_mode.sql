/*
  # Limpiar todas las referencias a payment_receipts

  1. Eliminar triggers y funciones
    - Eliminar trigger `create_receipt_after_sale` de la tabla `sales`
    - Eliminar función `create_payment_receipt()` si existe
    - Eliminar función `update_payment_receipts_updated_at()` si existe

  2. Verificar limpieza
    - Asegurar que no queden referencias a payment_receipts
    - Confirmar que las ventas funcionen sin comprobantes automáticos
*/

-- Eliminar trigger de la tabla sales si existe
DROP TRIGGER IF EXISTS create_receipt_after_sale ON sales;

-- Eliminar funciones relacionadas con payment_receipts si existen
DROP FUNCTION IF EXISTS create_payment_receipt();
DROP FUNCTION IF EXISTS update_payment_receipts_updated_at();

-- Verificar que la tabla payment_receipts no existe
DROP TABLE IF EXISTS payment_receipts CASCADE;

-- Limpiar cualquier referencia restante en triggers o funciones
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Buscar y eliminar cualquier función que haga referencia a payment_receipts
    FOR r IN 
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_definition ILIKE '%payment_receipts%'
        AND routine_schema = 'public'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.routine_name || '() CASCADE';
    END LOOP;
END $$;