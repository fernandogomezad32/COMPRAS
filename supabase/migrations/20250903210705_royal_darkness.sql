/*
  # Actualizar políticas de ventas para CRUD completo

  1. Políticas existentes
    - Mantener políticas de lectura y creación
    - Agregar políticas de actualización y eliminación

  2. Seguridad
    - Solo usuarios autenticados pueden modificar ventas
    - Mantener integridad referencial
*/

-- Agregar política de actualización para ventas
CREATE POLICY "Usuarios autenticados pueden actualizar ventas"
  ON sales
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Agregar política de eliminación para ventas
CREATE POLICY "Usuarios autenticados pueden eliminar ventas"
  ON sales
  FOR DELETE
  TO authenticated
  USING (true);

-- Agregar política de actualización para sale_items
CREATE POLICY "Usuarios autenticados pueden actualizar items de venta"
  ON sale_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Agregar política de eliminación para sale_items
CREATE POLICY "Usuarios autenticados pueden eliminar items de venta"
  ON sale_items
  FOR DELETE
  TO authenticated
  USING (true);

-- Crear función para actualizar stock cuando se elimina una venta
CREATE OR REPLACE FUNCTION restore_stock_on_sale_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Restaurar el stock de los productos cuando se elimina una venta
  UPDATE products 
  SET stock_quantity = stock_quantity + OLD.quantity
  WHERE id = OLD.product_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para restaurar stock al eliminar items de venta
CREATE TRIGGER restore_stock_on_sale_item_deletion
  AFTER DELETE ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION restore_stock_on_sale_deletion();