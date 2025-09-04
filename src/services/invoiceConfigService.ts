import { supabase } from '../lib/supabase';
import type { InvoiceConfig } from '../types';

export const invoiceConfigService = {
  async get(): Promise<InvoiceConfig | null> {
    const { data, error } = await supabase
      .from('invoice_config')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async update(config: Partial<InvoiceConfig>): Promise<InvoiceConfig> {
    // Primero intentar actualizar la configuración existente
    const { data: existingConfig } = await supabase
      .from('invoice_config')
      .select('id')
      .limit(1)
      .single();

    if (existingConfig) {
      // Actualizar configuración existente
      const { data, error } = await supabase
        .from('invoice_config')
        .update({
          ...config,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConfig.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Crear nueva configuración
      const { data, error } = await supabase
        .from('invoice_config')
        .insert(config)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  async getOrCreateDefault(): Promise<InvoiceConfig> {
    let config = await this.get();
    
    if (!config) {
      // Crear configuración por defecto
      config = await this.update({
        company_name: 'VentasPro',
        company_address: 'Calle Principal #123',
        company_city: 'Ciudad, País',
        company_phone: '(555) 123-4567',
        company_email: 'info@ventaspro.com',
        paper_size: 'A4',
        currency: 'COP',
        currency_symbol: '$',
        tax_rate: 0,
        include_tax: false,
        show_barcode: true,
        show_company_logo: false,
        footer_text: 'Gracias por su compra. Esta factura es válida como comprobante de pago.',
        terms_and_conditions: 'Términos y condiciones: Los productos tienen garantía de 30 días.',
        invoice_prefix: 'INV',
        barcode_position: 'bottom',
        font_size: 'medium',
        language: 'es'
      });
    }
    
    return config;
  }
};