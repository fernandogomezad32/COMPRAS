/*
  # Arreglar tabla de reportes

  1. Verificar y corregir la estructura de la tabla reports
  2. Asegurar que todos los campos necesarios estén presentes
  3. Corregir tipos de datos y constraints
  4. Actualizar políticas RLS si es necesario
*/

-- Verificar si la tabla existe y tiene la estructura correcta
DO $$
BEGIN
  -- Verificar si la columna type tiene los valores correctos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%reports_type_check%'
  ) THEN
    -- Agregar constraint para el tipo de reporte
    ALTER TABLE reports ADD CONSTRAINT reports_type_check 
    CHECK (type IN ('sales', 'inventory', 'customers', 'suppliers', 'custom'));
  END IF;

  -- Asegurar que filters sea un objeto JSON válido
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reports' AND column_name = 'filters' AND data_type = 'jsonb'
  ) THEN
    ALTER TABLE reports ALTER COLUMN filters TYPE jsonb USING filters::jsonb;
  END IF;

  -- Asegurar que date_range sea un objeto JSON válido
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reports' AND column_name = 'date_range' AND data_type = 'jsonb'
  ) THEN
    ALTER TABLE reports ALTER COLUMN date_range TYPE jsonb USING date_range::jsonb;
  END IF;

  -- Verificar que la función uid() existe para las políticas RLS
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'uid') THEN
    -- Crear función uid() si no existe
    CREATE OR REPLACE FUNCTION uid() RETURNS uuid AS $$
    BEGIN
      RETURN (SELECT auth.uid());
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  END IF;
END $$;

-- Asegurar que las políticas RLS estén correctas
DROP POLICY IF EXISTS "Users can create reports" ON reports;
DROP POLICY IF EXISTS "Users can read own reports" ON reports;
DROP POLICY IF EXISTS "Users can update own reports" ON reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON reports;

-- Recrear políticas RLS
CREATE POLICY "Users can create reports"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can read own reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can update own reports"
  ON reports
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own reports"
  ON reports
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Asegurar que RLS esté habilitado
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports(created_by);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_is_favorite ON reports(is_favorite);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_reports_updated_at ON reports;
CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();

-- Insertar algunos reportes de ejemplo si la tabla está vacía
INSERT INTO reports (name, description, type, filters, date_range, created_by, is_favorite)
SELECT 
  'Ventas del Mes',
  'Reporte de ventas del mes actual',
  'sales',
  '{}',
  '{"period": "month"}',
  auth.uid(),
  false
WHERE NOT EXISTS (SELECT 1 FROM reports WHERE type = 'sales' AND name = 'Ventas del Mes')
AND auth.uid() IS NOT NULL;

INSERT INTO reports (name, description, type, filters, date_range, created_by, is_favorite)
SELECT 
  'Estado del Inventario',
  'Reporte completo del inventario actual',
  'inventory',
  '{}',
  '{"period": "today"}',
  auth.uid(),
  false
WHERE NOT EXISTS (SELECT 1 FROM reports WHERE type = 'inventory' AND name = 'Estado del Inventario')
AND auth.uid() IS NOT NULL;

INSERT INTO reports (name, description, type, filters, date_range, created_by, is_favorite)
SELECT 
  'Base de Clientes',
  'Análisis de la base de clientes',
  'customers',
  '{}',
  '{"period": "year"}',
  auth.uid(),
  true
WHERE NOT EXISTS (SELECT 1 FROM reports WHERE type = 'customers' AND name = 'Base de Clientes')
AND auth.uid() IS NOT NULL;