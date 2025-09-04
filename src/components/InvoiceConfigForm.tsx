import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  FileText, 
  Settings,
  Palette,
  DollarSign,
  Image,
  Save
} from 'lucide-react';
import { invoiceConfigService } from '../services/invoiceConfigService';
import type { InvoiceConfig } from '../types';

interface InvoiceConfigFormProps {
  onSubmit: () => void;
  onCancel: () => void;
}

export function InvoiceConfigForm({ onSubmit, onCancel }: InvoiceConfigFormProps) {
  const [formData, setFormData] = useState({
    company_name: 'VentasPro',
    company_address: '',
    company_city: '',
    company_phone: '',
    company_email: '',
    company_website: '',
    company_tax_id: '',
    company_logo_url: '',
    paper_size: 'A4' as 'A4' | 'Letter' | 'A5' | 'Thermal',
    currency: 'COP',
    currency_symbol: '$',
    tax_rate: 0,
    include_tax: false,
    show_barcode: true,
    show_company_logo: false,
    footer_text: 'Gracias por su compra. Esta factura es válida como comprobante de pago.',
    terms_and_conditions: '',
    invoice_prefix: 'INV',
    barcode_position: 'bottom' as 'top' | 'bottom',
    font_size: 'medium' as 'small' | 'medium' | 'large',
    language: 'es' as 'es' | 'en'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await invoiceConfigService.getOrCreateDefault();
      if (config) {
        setFormData({
          company_name: config.company_name,
          company_address: config.company_address || '',
          company_city: config.company_city || '',
          company_phone: config.company_phone || '',
          company_email: config.company_email || '',
          company_website: config.company_website || '',
          company_tax_id: config.company_tax_id || '',
          company_logo_url: config.company_logo_url || '',
          paper_size: config.paper_size,
          currency: config.currency,
          currency_symbol: config.currency_symbol,
          tax_rate: config.tax_rate,
          include_tax: config.include_tax,
          show_barcode: config.show_barcode,
          show_company_logo: config.show_company_logo,
          footer_text: config.footer_text,
          terms_and_conditions: config.terms_and_conditions || '',
          invoice_prefix: config.invoice_prefix,
          barcode_position: config.barcode_position,
          font_size: config.font_size,
          language: config.language
        });
      }
    } catch (error) {
      console.error('Error loading invoice config:', error);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await invoiceConfigService.update(formData);
      onSubmit();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
               type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  if (loadingConfig) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Settings className="h-5 w-5 text-blue-600" />
            <span>Configuración de Facturas</span>
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Información de la Empresa */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Building className="h-5 w-5 mr-2 text-blue-600" />
              Información de la Empresa
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Empresa *
                </label>
                <input
                  type="text"
                  id="company_name"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="company_tax_id" className="block text-sm font-medium text-gray-700 mb-2">
                  RFC / ID Fiscal
                </label>
                <input
                  type="text"
                  id="company_tax_id"
                  name="company_tax_id"
                  value={formData.company_tax_id}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="company_address" className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    id="company_address"
                    name="company_address"
                    value={formData.company_address}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="company_city" className="block text-sm font-medium text-gray-700 mb-2">
                  Ciudad
                </label>
                <input
                  type="text"
                  id="company_city"
                  name="company_city"
                  value={formData.company_city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="company_phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    id="company_phone"
                    name="company_phone"
                    value={formData.company_phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="company_email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    id="company_email"
                    name="company_email"
                    value={formData.company_email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="company_website" className="block text-sm font-medium text-gray-700 mb-2">
                  Sitio Web
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="url"
                    id="company_website"
                    name="company_website"
                    value={formData.company_website}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://www.ejemplo.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Configuración de Formato */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Palette className="h-5 w-5 mr-2 text-blue-600" />
              Formato y Diseño
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="paper_size" className="block text-sm font-medium text-gray-700 mb-2">
                  Tamaño de Papel
                </label>
                <select
                  id="paper_size"
                  name="paper_size"
                  value={formData.paper_size}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="A4">📄 A4 (210 × 297 mm)</option>
                  <option value="Letter">📄 Carta (216 × 279 mm)</option>
                  <option value="A5">📄 A5 (148 × 210 mm)</option>
                  <option value="Thermal">🧾 Térmica (80mm)</option>
                </select>
              </div>

              <div>
                <label htmlFor="font_size" className="block text-sm font-medium text-gray-700 mb-2">
                  Tamaño de Fuente
                </label>
                <select
                  id="font_size"
                  name="font_size"
                  value={formData.font_size}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="small">🔤 Pequeña</option>
                  <option value="medium">🔤 Mediana</option>
                  <option value="large">🔤 Grande</option>
                </select>
              </div>

              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                  Idioma
                </label>
                <select
                  id="language"
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="es">🇪🇸 Español</option>
                  <option value="en">🇺🇸 English</option>
                </select>
              </div>

              <div>
                <label htmlFor="invoice_prefix" className="block text-sm font-medium text-gray-700 mb-2">
                  Prefijo de Factura
                </label>
                <input
                  type="text"
                  id="invoice_prefix"
                  name="invoice_prefix"
                  value={formData.invoice_prefix}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="INV"
                />
                <p className="text-xs text-gray-500 mt-1">Ej: INV-000001, FAC-000001</p>
              </div>

              <div>
                <label htmlFor="barcode_position" className="block text-sm font-medium text-gray-700 mb-2">
                  Posición del Código de Barras
                </label>
                <select
                  id="barcode_position"
                  name="barcode_position"
                  value={formData.barcode_position}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="top">⬆️ Arriba</option>
                  <option value="bottom">⬇️ Abajo</option>
                </select>
              </div>

              <div>
                <label htmlFor="company_logo_url" className="block text-sm font-medium text-gray-700 mb-2">
                  URL del Logo
                </label>
                <div className="relative">
                  <Image className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="url"
                    id="company_logo_url"
                    name="company_logo_url"
                    value={formData.company_logo_url}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://ejemplo.com/logo.png"
                  />
                </div>
              </div>
            </div>

            {/* Opciones de visualización */}
            <div className="mt-6 space-y-4">
              <h4 className="text-md font-medium text-gray-900">Opciones de Visualización</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="show_barcode"
                    checked={formData.show_barcode}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Mostrar código de barras</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="show_company_logo"
                    checked={formData.show_company_logo}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Mostrar logo de la empresa</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="include_tax"
                    checked={formData.include_tax}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Incluir impuestos</span>
                </label>
              </div>
            </div>
          </div>

          {/* Configuración Monetaria */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
              Configuración Monetaria
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                  Moneda
                </label>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="COP">🇨🇴 Peso Colombiano (COP)</option>
                  <option value="USD">🇺🇸 Dólar Americano (USD)</option>
                  <option value="EUR">🇪🇺 Euro (EUR)</option>
                  <option value="MXN">🇲🇽 Peso Mexicano (MXN)</option>
                </select>
              </div>

              <div>
                <label htmlFor="currency_symbol" className="block text-sm font-medium text-gray-700 mb-2">
                  Símbolo de Moneda
                </label>
                <input
                  type="text"
                  id="currency_symbol"
                  name="currency_symbol"
                  value={formData.currency_symbol}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  maxLength={3}
                />
              </div>

              <div>
                <label htmlFor="tax_rate" className="block text-sm font-medium text-gray-700 mb-2">
                  Tasa de Impuesto (%)
                </label>
                <input
                  type="number"
                  id="tax_rate"
                  name="tax_rate"
                  value={formData.tax_rate}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  max="100"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Textos Personalizados */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Textos Personalizados
            </h3>
            <div className="space-y-6">
              <div>
                <label htmlFor="footer_text" className="block text-sm font-medium text-gray-700 mb-2">
                  Texto del Pie de Página
                </label>
                <textarea
                  id="footer_text"
                  name="footer_text"
                  value={formData.footer_text}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Gracias por su compra..."
                />
              </div>

              <div>
                <label htmlFor="terms_and_conditions" className="block text-sm font-medium text-gray-700 mb-2">
                  Términos y Condiciones
                </label>
                <textarea
                  id="terms_and_conditions"
                  name="terms_and_conditions"
                  value={formData.terms_and_conditions}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Términos y condiciones de la venta..."
                />
              </div>
            </div>
          </div>

          {/* Vista Previa */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Vista Previa</h3>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm">
              <div className="text-center mb-4">
                <h4 className="text-lg font-bold">{formData.company_name}</h4>
                <p>{formData.company_address}</p>
                <p>{formData.company_city}</p>
                <p>{formData.company_phone} | {formData.company_email}</p>
                {formData.company_website && <p>{formData.company_website}</p>}
              </div>
              
              <div className="border-t border-gray-200 pt-4 mb-4">
                <div className="flex justify-between">
                  <span>FACTURA</span>
                  <span>{formData.invoice_prefix}-000001</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mb-4">
                <p className="font-medium">Producto de ejemplo x1</p>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formData.currency_symbol}100.00</span>
                </div>
                {formData.include_tax && (
                  <div className="flex justify-between">
                    <span>Impuesto ({formData.tax_rate}%):</span>
                    <span>{formData.currency_symbol}{(100 * formData.tax_rate / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{formData.currency_symbol}{formData.include_tax ? (100 + (100 * formData.tax_rate / 100)).toFixed(2) : '100.00'}</span>
                </div>
              </div>

              {formData.show_barcode && (
                <div className="text-center border-t border-gray-200 pt-4 mb-4">
                  <div className="bg-gray-100 p-2 rounded">
                    <p className="text-xs">||||| ||||| ||||| |||||</p>
                    <p className="text-xs font-mono">202501040001</p>
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-600 text-center border-t border-gray-200 pt-4">
                {formData.footer_text}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
            >
              <Save className="h-5 w-5" />
              <span>{loading ? 'Guardando...' : 'Guardar Configuración'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}