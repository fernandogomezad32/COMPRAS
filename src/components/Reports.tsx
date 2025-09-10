import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar,
  Package,
  Users,
  Building,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ShoppingCart
} from 'lucide-react';
import { saleService } from '../services/saleService';
import { productService } from '../services/productService';
import { customerService } from '../services/customerService';
import { supplierService } from '../services/supplierService';
import { returnService } from '../services/returnService';
import { installmentService } from '../services/installmentService';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function Reports() {
  const [activeTab, setActiveTab] = useState('sales');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const reportTypes = [
    { id: 'sales', name: 'Ventas', icon: ShoppingCart },
    { id: 'inventory', name: 'Inventario', icon: Package },
    { id: 'customers', name: 'Clientes', icon: Users },
    { id: 'suppliers', name: 'Proveedores', icon: Building },
    { id: 'returns', name: 'Devoluciones', icon: BarChart3 },
    { id: 'installments', name: 'Ventas por Abonos', icon: Calendar }
  ];

  const generateReport = async () => {
    setLoading(true);
    try {
      let data;
      
      switch (activeTab) {
        case 'sales':
          data = await generateSalesReport();
          break;
        case 'inventory':
          data = await generateInventoryReport();
          break;
        case 'customers':
          data = await generateCustomersReport();
          break;
        case 'suppliers':
          data = await generateSuppliersReport();
          break;
        case 'returns':
          data = await generateReturnsReport();
          break;
        case 'installments':
          data = await generateInstallmentsReport();
          break;
        default:
          data = null;
      }
      
      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const generateSalesReport = async () => {
    const sales = await saleService.getAll();
    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at).toISOString().split('T')[0];
      return saleDate >= dateRange.start && saleDate <= dateRange.end;
    });

    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalSales = filteredSales.length;
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Ventas por día
    const salesByDay = filteredSales.reduce((acc, sale) => {
      const day = new Date(sale.created_at).toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + sale.total;
      return acc;
    }, {} as Record<string, number>);

    // Productos más vendidos
    const productSales = filteredSales.flatMap(sale => sale.sale_items || []);
    const productStats = productSales.reduce((acc, item) => {
      const productName = item.product?.name || 'Producto eliminado';
      if (!acc[productName]) {
        acc[productName] = { quantity: 0, revenue: 0 };
      }
      acc[productName].quantity += item.quantity;
      acc[productName].revenue += item.total_price;
      return acc;
    }, {} as Record<string, { quantity: number; revenue: number }>);

    const topProducts = Object.entries(productStats)
      .sort(([,a], [,b]) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      type: 'sales',
      summary: {
        totalRevenue,
        totalSales,
        averageSale,
        period: `${format(new Date(dateRange.start), 'dd/MM/yyyy', { locale: es })} - ${format(new Date(dateRange.end), 'dd/MM/yyyy', { locale: es })}`
      },
      details: filteredSales,
      charts: {
        salesByDay,
        topProducts
      }
    };
  };

  const generateInventoryReport = async () => {
    const products = await productService.getAll();
    const lowStockProducts = await productService.getLowStock();
    
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.status === 'active').length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0);
    const totalCost = products.reduce((sum, p) => sum + (p.cost * p.stock_quantity), 0);

    // Productos por categoría
    const productsByCategory = products.reduce((acc, product) => {
      const categoryName = product.category?.name || 'Sin categoría';
      if (!acc[categoryName]) {
        acc[categoryName] = { count: 0, value: 0 };
      }
      acc[categoryName].count += 1;
      acc[categoryName].value += product.price * product.stock_quantity;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    return {
      type: 'inventory',
      summary: {
        totalProducts,
        activeProducts,
        lowStockCount: lowStockProducts.length,
        totalValue,
        totalCost,
        profitMargin: totalValue > 0 ? ((totalValue - totalCost) / totalValue * 100) : 0
      },
      details: products,
      lowStock: lowStockProducts,
      charts: {
        productsByCategory
      }
    };
  };

  const generateCustomersReport = async () => {
    const customers = await customerService.getAll();
    const sales = await saleService.getAll();
    
    // Estadísticas por cliente
    const customerStats = customers.map(customer => {
      const customerSales = sales.filter(sale => sale.customer_id === customer.id);
      const totalPurchases = customerSales.length;
      const totalSpent = customerSales.reduce((sum, sale) => sum + sale.total, 0);
      const lastPurchase = customerSales.length > 0 
        ? customerSales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : null;
      
      return {
        ...customer,
        totalPurchases,
        totalSpent,
        averagePurchase: totalPurchases > 0 ? totalSpent / totalPurchases : 0,
        lastPurchase
      };
    });

    const topCustomers = customerStats
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    return {
      type: 'customers',
      summary: {
        totalCustomers: customers.length,
        businessCustomers: customers.filter(c => c.customer_type === 'business').length,
        individualCustomers: customers.filter(c => c.customer_type === 'individual').length,
        customersWithPurchases: customerStats.filter(c => c.totalPurchases > 0).length
      },
      details: customerStats,
      topCustomers
    };
  };

  const generateSuppliersReport = async () => {
    const suppliers = await supplierService.getAll();
    const products = await productService.getAll();
    
    const supplierStats = suppliers.map(supplier => {
      const supplierProducts = products.filter(p => p.supplier_id === supplier.id);
      const totalProducts = supplierProducts.length;
      const totalValue = supplierProducts.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0);
      
      return {
        ...supplier,
        totalProducts,
        totalValue
      };
    });

    return {
      type: 'suppliers',
      summary: {
        totalSuppliers: suppliers.length,
        activeSuppliers: suppliers.filter(s => s.status === 'active').length,
        inactiveSuppliers: suppliers.filter(s => s.status === 'inactive').length
      },
      details: supplierStats
    };
  };

  const generateReturnsReport = async () => {
    const returns = await returnService.getAll();
    const stats = await returnService.getStats();
    
    const filteredReturns = returns.filter(returnItem => {
      const returnDate = new Date(returnItem.return_date).toISOString().split('T')[0];
      return returnDate >= dateRange.start && returnDate <= dateRange.end;
    });

    return {
      type: 'returns',
      summary: {
        totalReturns: filteredReturns.length,
        totalRefundAmount: filteredReturns.reduce((sum, r) => sum + r.refund_amount, 0),
        pendingReturns: filteredReturns.filter(r => r.status === 'pending').length,
        completedReturns: filteredReturns.filter(r => r.status === 'completed').length
      },
      details: filteredReturns,
      stats
    };
  };

  const generateInstallmentsReport = async () => {
    const installments = await installmentService.getAll();
    const stats = await installmentService.getStats();
    
    const filteredInstallments = installments.filter(installment => {
      const installmentDate = new Date(installment.created_at).toISOString().split('T')[0];
      return installmentDate >= dateRange.start && installmentDate <= dateRange.end;
    });

    return {
      type: 'installments',
      summary: {
        totalInstallments: filteredInstallments.length,
        totalAmountFinanced: filteredInstallments.reduce((sum, i) => sum + i.total_amount, 0),
        totalAmountPaid: filteredInstallments.reduce((sum, i) => sum + i.paid_amount, 0),
        activeInstallments: filteredInstallments.filter(i => i.status === 'active').length
      },
      details: filteredInstallments,
      stats
    };
  };

  const exportToExcel = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();
    
    // Hoja de resumen
    const summaryData = Object.entries(reportData.summary).map(([key, value]) => ({
      Métrica: key,
      Valor: value
    }));
    
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');

    // Hoja de detalles
    if (reportData.details && reportData.details.length > 0) {
      const detailsWs = XLSX.utils.json_to_sheet(reportData.details);
      XLSX.utils.book_append_sheet(wb, detailsWs, 'Detalles');
    }

    // Nombre del archivo
    const fileName = `reporte_${activeTab}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-600 mt-1">Genera reportes detallados de tu negocio</p>
        </div>
      </div>

      {/* Tabs de tipos de reporte */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {reportTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setActiveTab(type.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === type.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <span>{type.name}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Configuración del reporte */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Inicio
              </label>
              <input
                type="date"
                id="start_date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Fin
              </label>
              <input
                type="date"
                id="end_date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={generateReport}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <BarChart3 className="h-5 w-5" />
                <span>{loading ? 'Generando...' : 'Generar Reporte'}</span>
              </button>
            </div>
            <div className="flex items-end">
              <button
                onClick={exportToExcel}
                disabled={!reportData}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Download className="h-5 w-5" />
                <span>Exportar Excel</span>
              </button>
            </div>
          </div>

          {/* Contenido del reporte */}
          {reportData && (
            <div className="space-y-6">
              {/* Resumen */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen Ejecutivo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(reportData.summary).map(([key, value]) => (
                    <div key={key} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="text-sm text-gray-600 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </div>
                      <div className="text-xl font-bold text-gray-900 mt-1">
                        {typeof value === 'number' && (key.toLowerCase().includes('amount') || key.toLowerCase().includes('revenue') || key.toLowerCase().includes('value') || key.toLowerCase().includes('cost'))
                          ? `$${(value ?? 0).toLocaleString()}`
                          : typeof value === 'number' && (key.toLowerCase().includes('percentage') || key.toLowerCase().includes('margin'))
                          ? `${(value ?? 0).toFixed(1)}%`
                          : typeof value === 'number' ? (value ?? 0).toLocaleString() : value || 'N/A'
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gráficos y datos específicos por tipo */}
              {activeTab === 'sales' && reportData.charts && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Productos más vendidos */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Productos Más Vendidos</h4>
                    <div className="space-y-3">
                      {reportData.charts.topProducts.slice(0, 5).map(([product, stats]: [string, any], index: number) => (
                        <div key={product} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-bold text-sm">{index + 1}</span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{product}</div>
                              <div className="text-sm text-gray-500">{stats.quantity} unidades</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">${stats.revenue.toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ventas por día */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Ventas por Día</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {Object.entries(reportData.charts.salesByDay)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .slice(0, 10)
                        .map(([date, amount]: [string, any]) => (
                        <div key={date} className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">
                            {format(new Date(date), 'dd/MM/yyyy', { locale: es })}
                          </span>
                          <span className="font-medium text-gray-900">${amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tabla de detalles */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900">Datos Detallados</h4>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {activeTab === 'sales' && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método Pago</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                          </>
                        )}
                        {activeTab === 'inventory' && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor Total</th>
                          </>
                        )}
                        {activeTab === 'customers' && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compras</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Gastado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Última Compra</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.details.slice(0, 50).map((item: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          {activeTab === 'sales' && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.customer?.name || item.customer_name || 'Cliente anónimo'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                ${item.total.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.payment_method}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                              </td>
                            </>
                          )}
                          {activeTab === 'inventory' && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {item.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.category?.name || 'Sin categoría'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <span className={item.stock_quantity <= item.min_stock ? 'text-red-600 font-medium' : ''}>
                                  {item.stock_quantity}
                                </span>
                                {item.stock_quantity <= item.min_stock && (
                                  <AlertTriangle className="inline h-4 w-4 text-red-500 ml-1" />
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ${item.price.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                ${(item.price * item.stock_quantity).toLocaleString()}
                              </td>
                            </>
                          )}
                          {activeTab === 'customers' && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {item.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.customer_type === 'business' ? 'Empresa' : 'Persona'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.totalPurchases || 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                ${(item.totalSpent || 0).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.lastPurchase 
                                  ? format(new Date(item.lastPurchase), 'dd/MM/yyyy', { locale: es })
                                  : 'Nunca'
                                }
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Alertas específicas */}
              {activeTab === 'inventory' && reportData.lowStock && reportData.lowStock.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <h4 className="text-lg font-semibold text-red-900">Productos con Stock Bajo</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reportData.lowStock.slice(0, 6).map((product: any) => (
                      <div key={product.id} className="bg-white rounded-lg p-4 border border-red-200">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-red-600">
                          Stock: {product.stock_quantity} / Mínimo: {product.min_stock}
                        </div>
                        <div className="text-sm text-gray-500">${product.price.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Estado inicial */}
          {!reportData && (
            <div className="text-center py-12">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Selecciona un período y genera tu reporte</h3>
              <p className="mt-1 text-sm text-gray-500">
                Configura las fechas y haz clic en "Generar Reporte" para ver los datos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}