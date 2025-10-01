import React, { useState, useEffect } from 'react';
import { Search, FileText, Download, Eye, Calendar, User, CreditCard, Settings, List, Filter } from 'lucide-react';
import { saleService } from '../services/saleService';
import { invoiceService } from '../services/invoiceService';
import { InvoiceConfigForm } from './InvoiceConfigForm';
import type { Sale } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { userService } from '../services/userService';
import { useAuth } from '../hooks/useAuth';

export function InvoiceSearch() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'barcode' | 'invoice'>('barcode');
  const [foundSale, setFoundSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [userRole, setUserRole] = useState<string>('employee');
  const [viewMode, setViewMode] = useState<'search' | 'list'>('list');
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [filterText, setFilterText] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    loadUserRole();
    if (viewMode === 'list') {
      loadAllSales();
    }
  }, [user, viewMode]);

  useEffect(() => {
    filterSales();
  }, [allSales, filterText]);

  const loadUserRole = async () => {
    if (user) {
      try {
        const role = await userService.getCurrentUserRole();
        console.log('🔍 [InvoiceSearch] User role loaded:', role);
        setUserRole(role);
      } catch (error) {
        console.error('Error loading user role:', error);
        console.log('🚨 [InvoiceSearch] Defaulting to employee role due to error');
        setUserRole('employee');
      }
    }
  };

  const loadAllSales = async () => {
    setLoading(true);
    setError(null);
    try {
      const sales = await saleService.getAll();
      setAllSales(sales);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las facturas');
    } finally {
      setLoading(false);
    }
  };

  const filterSales = () => {
    if (!filterText.trim()) {
      setFilteredSales(allSales);
      return;
    }

    const filtered = allSales.filter(sale => {
      const searchLower = filterText.toLowerCase();
      return (
        sale.invoice_number?.toLowerCase().includes(searchLower) ||
        sale.invoice_barcode?.toLowerCase().includes(searchLower) ||
        sale.customer?.name?.toLowerCase().includes(searchLower) ||
        sale.customer_name?.toLowerCase().includes(searchLower)
      );
    });
    setFilteredSales(filtered);
  };

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

  const handleViewSale = (sale: Sale) => {
    setSelectedSale(sale);
  };

  const handleDownloadSalePDF = (sale: Sale) => {
    invoiceService.generateInvoice(sale).catch(error => {
      console.error('Error generating invoice:', error);
      alert('Error al generar la factura');
    });
  };

  const closeDetailView = () => {
    setSelectedSale(null);
  };

  if (selectedSale) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={closeDetailView}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-2"
          >
            <Eye className="h-5 w-5" />
            <span>Volver al listado</span>
          </button>
        </div>
        <InvoiceDetailView sale={selectedSale} onDownload={() => handleDownloadSalePDF(selectedSale)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Facturas</h1>
          <p className="text-gray-600 mt-1">Visualiza, busca y descarga facturas</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 flex">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md flex items-center space-x-2 transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List className="h-4 w-4" />
              <span>Listado</span>
            </button>
            <button
              onClick={() => setViewMode('search')}
              className={`px-4 py-2 rounded-md flex items-center space-x-2 transition-colors ${
                viewMode === 'search'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Search className="h-4 w-4" />
              <span>Búsqueda</span>
            </button>
          </div>
        </div>
      </div>

      {(userRole === 'admin' || userRole === 'super_admin') && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowConfig(true)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Configurar Facturas</span>
          </button>
        </div>
      )}

      {viewMode === 'list' && (
        <InvoiceListView
          sales={filteredSales}
          filterText={filterText}
          onFilterChange={setFilterText}
          onViewSale={handleViewSale}
          onDownloadSale={handleDownloadSalePDF}
          loading={loading}
          error={error}
        />
      )}

      {viewMode === 'search' && (
        <>
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

          {foundSale && (
            <InvoiceDetailView sale={foundSale} onDownload={handleDownloadInvoice} />
          )}

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
        </>
      )}

      {showConfig && (userRole === 'admin' || userRole === 'super_admin') && (
        <InvoiceConfigForm
          onSubmit={() => setShowConfig(false)}
          onCancel={() => setShowConfig(false)}
        />
      )}
    </div>
  );
}

interface InvoiceListViewProps {
  sales: Sale[];
  filterText: string;
  onFilterChange: (text: string) => void;
  onViewSale: (sale: Sale) => void;
  onDownloadSale: (sale: Sale) => void;
  loading: boolean;
  error: string | null;
}

function InvoiceListView({
  sales,
  filterText,
  onFilterChange,
  onViewSale,
  onDownloadSale,
  loading,
  error
}: InvoiceListViewProps) {
  return (
    <>
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="mb-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Filtrar por número de factura, código de barras o cliente..."
              value={filterText}
              onChange={(e) => onFilterChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Cargando facturas...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {!loading && !error && sales.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron facturas</p>
          </div>
        )}

        {!loading && !error && sales.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factura</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">{sale.invoice_number}</div>
                      <div className="text-xs text-gray-500 font-mono">{sale.invoice_barcode}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{sale.customer?.name || sale.customer_name}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        {format(new Date(sale.created_at), 'dd/MM/yyyy', { locale: es })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(sale.created_at), 'HH:mm', { locale: es })}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="text-sm font-medium text-green-600">${sale.total.toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                        sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {sale.status === 'completed' ? 'Completada' :
                         sale.status === 'pending' ? 'Pendiente' :
                         'Cancelada'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => onViewSale(sale)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDownloadSale(sale)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Descargar PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900">Información</h3>
            <p className="mt-1 text-sm text-blue-700">
              Mostrando {sales.length} factura{sales.length !== 1 ? 's' : ''}.
              Usa el filtro para buscar por número de factura, código de barras o nombre del cliente.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

interface InvoiceDetailViewProps {
  sale: Sale;
  onDownload: () => void;
}

function InvoiceDetailView({ sale, onDownload }: InvoiceDetailViewProps) {
  return (
    <div className="bg-white rounded-xl shadow-md">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Factura {sale.invoice_number}</h2>
              <p className="text-sm text-gray-600">
                Código: {sale.invoice_barcode} |
                {format(new Date(sale.created_at), ' dd/MM/yyyy HH:mm', { locale: es })}
              </p>
            </div>
          </div>
          <button
            onClick={onDownload}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Descargar PDF</span>
          </button>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
          <User className="h-5 w-5 mr-2 text-blue-600" />
          Información del Cliente
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Nombre:</p>
            <p className="font-medium text-gray-900">{sale.customer?.name || sale.customer_name}</p>
          </div>
          {(sale.customer?.email || sale.customer_email) && (
            <div>
              <p className="text-sm text-gray-600">Email:</p>
              <p className="font-medium text-gray-900">{sale.customer?.email || sale.customer_email}</p>
            </div>
          )}
          {sale.customer?.phone && (
            <div>
              <p className="text-sm text-gray-600">Teléfono:</p>
              <p className="font-medium text-gray-900">{sale.customer.phone}</p>
            </div>
          )}
          {sale.customer?.customer_type && (
            <div>
              <p className="text-sm text-gray-600">Tipo:</p>
              <p className="font-medium text-gray-900">
                {sale.customer.customer_type === 'business' ? 'Empresa' : 'Persona Física'}
              </p>
            </div>
          )}
        </div>
      </div>

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
              {sale.sale_items?.map((item) => {
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

      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Totales</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">${sale.subtotal.toLocaleString()}</span>
              </div>
              {sale.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-red-600">
                    Descuento {sale.discount_type === 'percentage' ? `(${sale.discount_percentage}%)` : ''}:
                  </span>
                  <span className="font-medium text-red-600">-${sale.discount_amount.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-green-600">${sale.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
              Información de Pago
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Método:</span>
                <span className="font-medium">
                  {sale.payment_method === 'cash' ? '💵 Efectivo' :
                   sale.payment_method === 'card' ? '💳 Tarjeta' :
                   sale.payment_method === 'nequi' ? '📱 NEQUI' :
                   sale.payment_method === 'daviplata' ? '📱 DAVIPLATA' :
                   sale.payment_method === 'bancolombia' ? '📱 BANCOLOMBIA' :
                   sale.payment_method === 'transfer' ? '📱 Transferencia' :
                   sale.payment_method}
                </span>
              </div>
              {sale.amount_received > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recibido:</span>
                    <span className="font-medium">${sale.amount_received.toLocaleString()}</span>
                  </div>
                  {sale.change_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cambio:</span>
                      <span className="font-medium text-orange-600">${sale.change_amount.toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Estado:</span>
                <span className={`font-medium ${
                  sale.status === 'completed' ? 'text-green-600' :
                  sale.status === 'pending' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {sale.status === 'completed' ? 'Completada' :
                   sale.status === 'pending' ? 'Pendiente' :
                   'Cancelada'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onDownload}
            className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 flex items-center space-x-2 mx-auto"
          >
            <Download className="h-5 w-5" />
            <span>Descargar Factura PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
