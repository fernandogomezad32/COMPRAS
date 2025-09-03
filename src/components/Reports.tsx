import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  Plus,
  Edit2,
  Trash2,
  Star,
  FileText,
  Eye
} from 'lucide-react';
import { saleService } from '../services/saleService';
import { productService } from '../services/productService';
import { customerService } from '../services/customerService';
import { reportService } from '../services/reportService';
import type { Sale, Product, Customer, Report } from '../types';
import { ReportForm } from './ReportForm';
import { SaleForm } from './SaleForm';
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

export function Reports() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [customerStats, setCustomerStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('today');
  const [showForm, setShowForm] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [activeTab, setActiveTab] = useState<'analytics' | 'saved'>('analytics');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [salesData, productsData, customerStatsData, reportsData] = await Promise.all([
        saleService.getAll(),
        productService.getAll(),
        customerService.getStats(),
        reportService.getAll()
      ]);
      setSales(salesData);
      setProducts(productsData);
      setCustomerStats(customerStatsData);
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditReport = (report: Report) => {
    setEditingReport(report);
    setShowForm(true);
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setShowSaleForm(true);
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta venta? Esta acción restaurará el stock de los productos.')) {
      return;
    }

    try {
      await saleService.delete(saleId);
      await loadData();
      alert('Venta eliminada exitosamente');
    } catch (error: any) {
      console.error('Error deleting sale:', error);
      alert('Error al eliminar la venta: ' + (error.message || 'Error desconocido'));
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este reporte?')) {
      return;
    }

    try {
      await reportService.delete(reportId);
      await loadData();
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Error al eliminar el reporte');
    }
  };

  const handleToggleFavorite = async (reportId: string, isFavorite: boolean) => {
    try {
      await reportService.toggleFavorite(reportId, !isFavorite);
      await loadData();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleFormSubmit = async () => {
    setShowForm(false);
    setEditingReport(null);
    await loadData();
  };

  const handleSaleFormSubmit = async () => {
    setShowSaleForm(false);
    setEditingSale(null);
    await loadData();
  };

  const getFilteredSales = () => {
    const now = new Date();
    let startDate: Date;

    switch (dateFilter) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      default:
        return sales;
    }

    return sales.filter(sale => 
      new Date(sale.created_at) >= startDate
    );
  };

  const generateStats = () => {
    const filteredSales = getFilteredSales();
    const revenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const profit = filteredSales.reduce((sum, sale) => {
      const saleProfit = sale.sale_items?.reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.product_id);
        const itemProfit = product ? (item.unit_price - product.cost) * item.quantity : 0;
        return itemSum + itemProfit;
      }, 0) || 0;
      return sum + saleProfit;
    }, 0);

    const topProducts = products
      .map(product => {
        const sold = filteredSales.reduce((sum, sale) => {
          const saleItems = sale.sale_items?.filter(item => item.product_id === product.id) || [];
          return sum + saleItems.reduce((itemSum, item) => itemSum + item.quantity, 0);
        }, 0);
          const revenue = filteredSales.reduce((sum, sale) => {
            const saleItems = sale.sale_items?.filter(item => item.product_id === product.id) || [];
            return sum + saleItems.reduce((itemSum, item) => itemSum + item.total_price, 0);
          }, 0);
          return { ...product, soldQuantity: sold, revenue };
      })
        .filter(product => product.soldQuantity > 0)
        .sort((a, b) => b.soldQuantity - a.soldQuantity);

    const allSoldProducts = topProducts;

    return {
      totalSales: filteredSales.length,
      revenue,
      profit,
      topProducts: topProducts.slice(0, 5),
      allSoldProducts
    };
  };

  const stats = generateStats();

  const exportToExcel = () => {
    const filteredSales = getFilteredSales();
    const soldProducts = stats.allSoldProducts;
    
    // Crear workbook
    const wb = XLSX.utils.book_new();
    
    // Hoja 1: Resumen de ventas
    const summaryData = [
      ['Reporte de Ventas'],
      ['Período:', dateFilter === 'today' ? 'Hoy' : dateFilter === 'week' ? 'Esta Semana' : dateFilter === 'month' ? 'Este Mes' : 'Todo el Tiempo'],
      ['Fecha de generación:', format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })],
      [],
      ['RESUMEN'],
      ['Total de ventas:', stats.totalSales],
      ['Ingresos totales:', `$${stats.revenue.toLocaleString()}`],
      ['Ganancia total:', `$${stats.profit.toLocaleString()}`],
      ['Productos vendidos:', soldProducts.length],
      []
    ];
    
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');
    
    // Hoja 2: Productos vendidos
    const productsData = [
      ['PRODUCTOS VENDIDOS'],
      [],
      ['Producto', 'Categoría', 'Precio Unitario', 'Cantidad Vendida', 'Stock Actual', 'Ingresos Generados', 'Ganancia Total']
    ];
    
    soldProducts.forEach(product => {
      const profit = (product.price - product.cost) * product.soldQuantity;
      productsData.push([
        product.name,
        product.category?.name || 'Sin categoría',
        product.price,
        product.soldQuantity,
        product.stock_quantity,
        product.revenue,
        profit
      ]);
    });
    
    const ws2 = XLSX.utils.aoa_to_sheet(productsData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Productos Vendidos');
    
    // Hoja 3: Ventas detalladas
    const salesData = [
      ['VENTAS DETALLADAS'],
      [],
      ['Fecha', 'Cliente', 'Tipo Cliente', 'Email', 'Método Pago', 'Estado', 'Subtotal', 'Descuento', 'Ganancia', 'Total', 'Recibido', 'Cambio', 'Productos']
    ];
    
    filteredSales.forEach(sale => {
      // Calcular ganancia de la venta
      const saleProfit = sale.sale_items?.reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.product_id);
        if (!product) return itemSum;
        const itemProfit = (item.unit_price - product.cost) * item.quantity;
        return itemSum + itemProfit;
      }, 0) || 0;
      
      const finalProfit = saleProfit - (sale.discount_amount || 0);
      
      const productsText = sale.sale_items?.map(item => 
        `${item.product?.name || 'Producto eliminado'} x${item.quantity}`
      ).join(', ') || 'Sin productos';
      
      const discountText = sale.discount_type === 'none' || !sale.discount_amount 
        ? '0' 
        : sale.discount_type === 'percentage' 
          ? `${sale.discount_percentage}% ($${sale.discount_amount})`
          : `$${sale.discount_amount}`;
      
      salesData.push([
        format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: es }),
        sale.customer?.name || sale.customer_name || 'Cliente anónimo',
        sale.customer ? (sale.customer.customer_type === 'business' ? 'Empresa' : 'Individual') : 'Anónimo',
        sale.customer?.email || sale.customer_email || '',
        sale.payment_method,
        sale.status === 'completed' ? 'Completada' : sale.status === 'pending' ? 'Pendiente' : 'Cancelada',
        sale.subtotal,
        discountText,
        finalProfit,
        sale.total,
        sale.amount_received || 0,
        sale.change_amount || 0,
        productsText
      ]);
    });
    
    const ws3 = XLSX.utils.aoa_to_sheet(salesData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Ventas Detalladas');
    
    // Generar nombre del archivo
    const fileName = `reporte_ventas_${dateFilter}_${format(new Date(), 'yyyy-MM-dd_HH-mm', { locale: es })}.xlsx`;
    
    // Descargar archivo
    XLSX.writeFile(wb, fileName);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-600 mt-1">Analiza el rendimiento de tu negocio</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Reporte</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Análisis</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'saved'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Reportes Guardados ({reports.length})</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'analytics' && (
        <>
          {/* Filtros para análisis */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Filtros de Análisis</h2>
              <div className="flex items-center space-x-4">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="today">Hoy</option>
                  <option value="week">Esta Semana</option>
                  <option value="month">Este Mes</option>
                  <option value="all">Todo el Tiempo</option>
                </select>
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2">
                  <Download className="h-4 w-4" />
                  <span>Exportar</span>
                </button>
                <button 
                  onClick={exportToExcel}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Exportar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ventas</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalSales}</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ingresos</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">${stats.revenue.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ganancia</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">${stats.profit.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Clientes</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{customerStats?.totalCustomers || 0}</p>
                </div>
                <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Productos Vendidos */}
          <div className="bg-white rounded-xl shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Productos Vendidos</h2>
                <span className="text-sm text-gray-500">
                  {stats.allSoldProducts.length} productos vendidos
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio Unitario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad Vendida
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Actual
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ingresos Generados
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.allSoldProducts.map((product, index) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Package className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">{product.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {product.category?.name || 'Sin categoría'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${product.price.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg font-bold text-blue-600">{product.soldQuantity}</span>
                          <span className="text-sm text-gray-500 ml-1">unidades</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          product.stock_quantity <= product.min_stock 
                            ? 'text-red-600' 
                            : 'text-gray-900'
                        }`}>
                          {product.stock_quantity} unidades
                        </span>
                        {product.stock_quantity <= product.min_stock && (
                          <div className="text-xs text-red-500">Stock bajo</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-lg font-bold text-green-600">
                          ${product.revenue.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          Ganancia: ${((product.price - product.cost) * product.soldQuantity).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {stats.allSoldProducts.length === 0 && (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay productos vendidos</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No se encontraron productos vendidos para el período seleccionado.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'saved' && (
        <div className="bg-white rounded-xl shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Reportes Guardados</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reporte
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Período
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <FileText className="h-8 w-8 text-blue-500" />
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center space-x-2">
                            <div className="text-sm font-medium text-gray-900">{report.name}</div>
                            {report.is_favorite && (
                              <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{report.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {report.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.date_range.period === 'custom' 
                        ? `${report.date_range.start_date} - ${report.date_range.end_date}`
                        : report.date_range.period
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(report.created_at), 'dd/MM/yyyy', { locale: es })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleToggleFavorite(report.id, report.is_favorite)}
                          className={`p-2 rounded-lg transition-colors ${
                            report.is_favorite
                              ? 'text-yellow-600 hover:bg-yellow-50'
                              : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
                          }`}
                        >
                          <Star className={`h-4 w-4 ${report.is_favorite ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleEditReport(report)}
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteReport(report.id)}
                          className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {reports.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay reportes guardados</h3>
              <p className="mt-1 text-sm text-gray-500">Crea tu primer reporte personalizado.</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Crear Reporte
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ventas</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalSales}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">${stats.revenue.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ganancia</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">${stats.profit.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clientes</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{customerStats?.totalCustomers || 0}</p>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Top Customers */}
      {customerStats?.topCustomers && customerStats.topCustomers.length > 0 && (
        <div className="bg-white rounded-xl shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Mejores Clientes</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {customerStats.topCustomers.map((customer: any, index: number) => (
                <div key={customer.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{customer.name}</h3>
                      <p className="text-sm text-gray-600">
                        {customer.email || customer.phone || 'Sin contacto'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{customer.totalPurchases} compras</p>
                    <p className="text-sm text-green-600">
                      ${customer.totalSpent.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Products */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Productos Más Vendidos</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {stats.topProducts.map((product, index) => (
              <div key={product.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-600">{product.category?.name || 'Sin categoría'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{product.soldQuantity} vendidos</p>
                  <p className="text-sm text-green-600">
                    ${product.revenue.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {stats.topProducts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No hay datos de ventas para el período seleccionado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ventas Recientes */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Ventas Recientes</h2>
            <span className="text-sm text-gray-500">
              {getFilteredSales().length} ventas encontradas
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Productos Vendidos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Método de Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pago
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subtotal
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descuento
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ganancia
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getFilteredSales().slice(0, 10).map((sale) => {
                // Calcular ganancia de la venta
                const saleProfit = sale.sale_items?.reduce((itemSum, item) => {
                  const product = products.find(p => p.id === item.product_id);
                  if (!product) return itemSum;
                  const itemProfit = (item.unit_price - product.cost) * item.quantity;
                  return itemSum + itemProfit;
                }, 0) || 0;
                
                // Ajustar ganancia por descuento aplicado
                const finalProfit = saleProfit - (sale.discount_amount || 0);
                const isProfitable = finalProfit >= 0;
                
                return (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {sale.customer?.name || sale.customer_name || 'Cliente anónimo'}
                    </div>
                    {(sale.customer?.email || sale.customer_email) && (
                      <div className="text-sm text-gray-500">{sale.customer?.email || sale.customer_email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      {sale.sale_items && sale.sale_items.length > 0 ? (
                        <div className="space-y-1">
                          {sale.sale_items.slice(0, 3).map((item, index) => (
                            <div key={index} className="text-xs bg-gray-100 rounded px-2 py-1">
                              <span className="font-medium">{item.product?.name || 'Producto eliminado'}</span>
                              <span className="text-gray-600 ml-1">x{item.quantity}</span>
                            </div>
                          ))}
                          {sale.sale_items.length > 3 && (
                            <div className="text-xs text-gray-500">
                              +{sale.sale_items.length - 3} más...
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin productos</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {sale.customer ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        sale.customer.customer_type === 'business'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {sale.customer.customer_type === 'business' ? 'Empresa' : 'Individual'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Anónimo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                      {sale.payment_method}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      sale.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : sale.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {sale.status === 'completed' ? 'Completada' : 
                       sale.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {sale.payment_method === 'cash' && sale.amount_received > 0 ? (
                      <div className="text-sm">
                        <div className="text-gray-900">Recibido: ${sale.amount_received.toLocaleString()}</div>
                        {sale.change_amount > 0 && (
                          <div className="text-orange-600">Cambio: ${sale.change_amount.toLocaleString()}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    ${sale.subtotal.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {sale.discount_amount > 0 ? (
                      <div className="text-red-600 font-medium">
                        {sale.discount_type === 'percentage' 
                          ? `${sale.discount_percentage}%` 
                          : `$${sale.discount_amount.toLocaleString()}`
                        }
                        <div className="text-xs text-gray-500">
                          -${sale.discount_amount.toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className={`font-medium ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                      ${finalProfit.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {isProfitable ? 'Ganancia' : 'Pérdida'}
                    </div>
                    {!isProfitable && (
                      <div className="text-xs text-red-500 font-medium">
                        ⚠️ Descuento excesivo
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    ${sale.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEditSale(sale)}
                        className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar venta"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSale(sale.id)}
                        className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar venta"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {getFilteredSales().length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay ventas</h3>
            <p className="mt-1 text-sm text-gray-500">No se encontraron ventas para el período seleccionado.</p>
          </div>
        )}
      </div>
        </>
      )}

      {/* Modal del formulario */}
      {showForm && (
        <ReportForm
          report={editingReport}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingReport(null);
          }}
        />
      )}

      {/* Modal del formulario de venta */}
      {showSaleForm && (
        <SaleForm
          sale={editingSale}
          onSubmit={handleSaleFormSubmit}
          onCancel={() => {
            setShowSaleForm(false);
            setEditingSale(null);
          }}
        />
      )}
    </div>
  );
}