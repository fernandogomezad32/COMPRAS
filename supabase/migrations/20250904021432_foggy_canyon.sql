/*
  # Create invoice configuration table

  1. New Tables
    - `invoice_config`
      - `id` (uuid, primary key)
      - `company_name` (text, required)
      - `company_address` (text)
      - `company_city` (text)
      - `company_phone` (text)
      - `company_email` (text)
      - `company_website` (text, optional)
      - `company_tax_id` (text, optional)
      - `company_logo_url` (text, optional)
      - `paper_size` (text, default 'A4')
      - `currency` (text, default 'COP')
      - `currency_symbol` (text, default '$')
      - `tax_rate` (numeric, default 0)
      - `include_tax` (boolean, default false)
      - `show_barcode` (boolean, default true)
      - `show_company_logo` (boolean, default false)
      - `footer_text` (text)
      - `terms_and_conditions` (text)
      - `invoice_prefix` (text, default 'INV')
      - `barcode_position` (text, default 'bottom')
      - `font_size` (text, default 'medium')
      - `language` (text, default 'es')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `invoice_config` table
    - Add policies for authenticated users to manage invoice configuration
    
  3. Default Configuration
    - Insert default configuration for new installations
*/

CREATE TABLE IF NOT EXISTS invoice_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'VentasPro',
  company_address text DEFAULT '',
  company_city text DEFAULT '',
  company_phone text DEFAULT '',
  company_email text DEFAULT '',
  company_website text DEFAULT '',
  company_tax_id text DEFAULT '',
  company_logo_url text DEFAULT '',
  paper_size text DEFAULT 'A4' CHECK (paper_size IN ('A4', 'Letter', 'A5', 'Thermal')),
  currency text DEFAULT 'COP',
  currency_symbol text DEFAULT '$',
  tax_rate numeric(5,2) DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  include_tax boolean DEFAULT false,
  show_barcode boolean DEFAULT true,
  show_company_logo boolean DEFAULT false,
  footer_text text DEFAULT 'Gracias por su compra. Esta factura es válida como comprobante de pago.',
  terms_and_conditions text DEFAULT '',
  invoice_prefix text DEFAULT 'INV',
  barcode_position text DEFAULT 'bottom' CHECK (barcode_position IN ('top', 'bottom')),
  font_size text DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
  language text DEFAULT 'es' CHECK (language IN ('es', 'en')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read invoice config"
  ON invoice_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update invoice config"
  ON invoice_config
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can insert invoice config"
  ON invoice_config
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_invoice_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_config_updated_at
  BEFORE UPDATE ON invoice_config
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_config_updated_at();

-- Insertar configuración por defecto
INSERT INTO invoice_config (
  company_name,
  company_address,
  company_city,
  company_phone,
  company_email,
  footer_text,
  terms_and_conditions
) VALUES (
  'VentasPro',
  'Calle Principal #123',
  'Ciudad, País',
  '(555) 123-4567',
  'info@ventaspro.com',
  'Gracias por su compra. Esta factura es válida como comprobante de pago.',
  'Términos y condiciones: Los productos tienen garantía de 30 días. No se aceptan devoluciones sin comprobante.'
) ON CONFLICT DO NOTHING;