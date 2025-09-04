import React, { useState } from 'react';
import { Search, FileText, Download, Eye, Calendar, User, CreditCard, Settings } from 'lucide-react';
import { saleService } from '../services/saleService';
import { invoiceService } from '../services/invoiceService';
import { InvoiceConfigForm } from './InvoiceConfigForm';
import type { Sale } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function InvoiceSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'barcode' | 'invoice'>('barcode');
  const [foundSale, setFoundSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);
    setFoundSale(null);

    try {
      let sale: Sale | null = null;
      
      if (searchType === 'barcode') {
        sale = await saleService.searchByBarcode(searchTerm.trim());
      } else {
        sale = await saleService.searchByInvoiceNumber(searchTerm.trim());
      }

      if (sale) {
        setFoundSale(sale);
      } else {
        setError(`No se encontró ninguna venta con ${searchType === 'barcode' ? 'código de barras' : 'número de factura'}: ${searchTerm}`);
      }
    } catch (err: any) {
      setError(err.message || 'Error al buscar la venta');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (foundSale) {
      invoiceService.generateInvoice(foundSale).catch(error => {
        console.error('Error generating invoice:', error);
        alert('Error al generar la factura');
      });
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setFoundSale(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Búsqueda de Facturas</h1>
        <p className="text-gray-600 mt-1">Busca ventas por código de barras o número de factura</p>
      </div>

        <button
          onClick={() => setShowConfig(true)}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center space-x-2"
        >
          <Settings className="h-4 w-4" />
          <span>Configurar Facturas</span>
        </button>
      {/* Formulario de búsqueda */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="searchType" className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Búsqueda
              </label>
              <select
                id="searchType"
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as 'barcode' | 'invoice')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="barcode">Código de Barras</option>
                <option value="invoice">Número de Factura</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 mb-2">
                {searchType === 'barcode' ? 'Código de Barras' : 'Número de Factura'}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="searchTerm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={searchType === 'barcode' ? 'Ej: 20250104001' : 'Ej: INV-000001'}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={clearSearch}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Limpiar
            </button>
            <button
              type="submit"
              disabled={loading || !searchTerm.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
            >
              <Search className="h-5 w-5" />
              <span>{loading ? 'Buscando...' : 'Buscar'}</span>
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Resultado de la búsqueda */}
      {foundSale && (
        <div className="bg-white rounded-xl shadow-md">
          {/* Header de la venta encontrada */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Factura {foundSale.invoice_number}</h2>
                  <p className="text-sm text-gray-600">
                    Código: {foundSale.invoice_barcode} | 
                    {format(new Date(foundSale.created_at), ' dd/MM/yyyy HH:mm', { locale: es })}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDownloadInvoice}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Descargar PDF</span>
              </button>
            </div>
          </div>

          {/* Información del cliente */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              Información del Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nombre:</p>
                <p className="font-medium text-gray-900">{foundSale.customer?.name || foundSale.customer_name}</p>
              </div>
              {(foundSale.customer?.email || foundSale.customer_email) && (
                <div>
                  <p className="text-sm text-gray-600">Email:</p>
                  <p className="font-medium text-gray-900">{foundSale.customer?.email || foundSale.customer_email}</p>
                </div>
              )}
              {foundSale.customer?.phone && (
                <div>
                  <p className="text-sm text-gray-600">Teléfono:</p>
                  <p className="font-medium text-gray-900">{foundSale.customer.phone}</p>
                </div>
              )}
              {foundSale.customer?.customer_type && (
                <div>
                  <p className="text-sm text-gray-600">Tipo:</p>
                  <p className="font-medium text-gray-900">
                    {foundSale.customer.customer_type === 'business' ? 'Empresa' : 'Persona Física'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Productos vendidos */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Productos Vendidos</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio Unit.</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Devoluciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {foundSale.sale_items?.map((item) => {
                    const totalReturned = item.returns?.reduce((sum, ret) => sum + ret.quantity_returned, 0) || 0;
                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{item.product?.name || 'Producto eliminado'}</div>
                          <div className="text-sm text-gray-500">{item.product?.description}</div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          ${item.unit_price.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          ${item.total_price.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {totalReturned > 0 ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              {totalReturned} devueltos
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">Sin devoluciones</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Información de pago y totales */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Totales */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Totales</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">${foundSale.subtotal.toLocaleString()}</span>
                  </div>
                  {foundSale.discount_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-red-600">
                        Descuento {foundSale.discount_type === 'percentage' ? `(${foundSale.discount_percentage}%)` : ''}:
                      </span>
                      <span className="font-medium text-red-600">-${foundSale.discount_amount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-green-600">${foundSale.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información de pago */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                  Información de Pago
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Método:</span>
                    <span className="font-medium">
                      {foundSale.payment_method === 'cash' ? '💵 Efectivo' :
                       foundSale.payment_method === 'card' ? '💳 Tarjeta' :
                       foundSale.payment_method === 'nequi' ? '📱 NEQUI' :
                       foundSale.payment_method === 'daviplata' ? '📱 DAVIPLATA' :
                       foundSale.payment_method === 'bancolombia' ? '📱 BANCOLOMBIA' :
                       foundSale.payment_method === 'transfer' ? '📱 Transferencia' :
                       foundSale.payment_method}
                    </span>
                  </div>
                  {foundSale.amount_received > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Recibido:</span>
                        <span className="font-medium">${foundSale.amount_received.toLocaleString()}</span>
                      </div>
                      {foundSale.change_amount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cambio:</span>
                          <span className="font-medium text-orange-600">${foundSale.change_amount.toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estado:</span>
                    <span className={`font-medium ${
                      foundSale.status === 'completed' ? 'text-green-600' :
                      foundSale.status === 'pending' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {foundSale.status === 'completed' ? 'Completada' :
                       foundSale.status === 'pending' ? 'Pendiente' :
                       'Cancelada'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Código de barras */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Código de Barras de la Factura</h3>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <canvas id={`barcode-${foundSale.id}`} className="mb-2 mx-auto"></canvas>
                <p className="text-sm text-gray-600 font-mono">{foundSale.invoice_barcode}</p>
              </div>
            </div>

            {/* Botón de descarga */}
            <div className="mt-6 text-center">
              <button
                onClick={handleDownloadInvoice}
                className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 flex items-center space-x-2 mx-auto"
              >
                <Download className="h-5 w-5" />
                <span>Descargar Factura PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instrucciones de uso */}
      {!foundSale && !error && (
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">Cómo usar la búsqueda</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>• <strong>Código de barras:</strong> Escanea o ingresa el código de 12 dígitos de la factura</p>
                <p>• <strong>Número de factura:</strong> Ingresa el número como INV-000001</p>
                <p>• Una vez encontrada, podrás descargar la factura en PDF</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de configuración */}
      {showConfig && (
        <InvoiceConfigForm
          onSubmit={() => setShowConfig(false)}
          onCancel={() => setShowConfig(false)}
        />
      )}
    </div>
  );
}