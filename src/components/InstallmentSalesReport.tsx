import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Clock, CheckCircle, AlertTriangle, XCircle, User, CreditCard as Edit2, Trash2, CreditCard, Package, TrendingUp } from 'lucide-react';
import { installmentService } from '../services/installmentService';
import type { InstallmentSale } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface InstallmentSalesReportProps {
  dateFilter: string;
  onEditSale: (sale: any) => void;
  onDeleteSale: (saleId: string) => void;
}

export function InstallmentSalesReport({ dateFilter, onEditSale, onDeleteSale }: InstallmentSalesReportProps) {
  const [installmentSales, setInstallmentSales] = useState<InstallmentSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInstallmentSales: 0,
    activeInstallmentSales: 0,
    overdueInstallmentSales: 0,
    totalAmountFinanced: 0,
    totalAmountPaid: 0,
    totalAmountPending: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [salesData, statsData] = await Promise.all([
        installmentService.getAll(),
        installmentService.getStats()
      ]);
      setInstallmentSales(salesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading installment sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: InstallmentSale['status']) => {
    switch (status) {
      case 'active': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'overdue': return <AlertTriangle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: InstallmentSale['status']) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressPercentage = (sale: InstallmentSale) => {
    return (sale.paid_amount / sale.total_amount) * 100;
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Ventas por Abonos</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalInstallmentSales}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monto Total Financiado</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">${stats.totalAmountFinanced.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monto Pendiente</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">${stats.totalAmountPending.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Ventas por Abonos */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Ventas por Abonos Recientes</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Plan de Abonos
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Progreso
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Montos
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Próximo Pago
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {installmentSales.slice(0, 10).map((sale) => {
                const progressPercentage = getProgressPercentage(sale);
                const isOverdue = sale.next_payment_date ? new Date(sale.next_payment_date) < new Date() && sale.status === 'active' : false;

                return (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {sale.customer?.name || 'Cliente eliminado'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {sale.customer?.email || sale.customer?.phone || 'Sin contacto'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">
                          {sale.installment_count} abonos {
                            sale.installment_type === 'daily' ? 'diarios' :
                            sale.installment_type === 'weekly' ? 'semanales' : 'mensuales'
                          }
                        </div>
                        <div className="text-gray-500">
                          ${sale.installment_amount.toLocaleString()} por abono
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {sale.paid_installments} / {sale.installment_count}
                          </span>
                          <span className="font-medium">
                            {progressPercentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              progressPercentage === 100 ? 'bg-green-500' :
                              progressPercentage >= 75 ? 'bg-blue-500' :
                              progressPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="text-gray-900 font-medium">
                          Total: ${sale.total_amount.toLocaleString()}
                        </div>
                        <div className="text-green-600">
                          Pagado: ${sale.paid_amount.toLocaleString()}
                        </div>
                        <div className="text-orange-600">
                          Pendiente: ${sale.remaining_amount.toLocaleString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {sale.next_payment_date ? (
                          <>
                            <div className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                              {format(new Date(sale.next_payment_date), 'dd/MM/yyyy', { locale: es })}
                            </div>
                            <div className="text-gray-500">
                              ${sale.installment_amount.toLocaleString()}
                            </div>
                            {isOverdue && (
                              <div className="text-red-500 text-xs font-medium">
                                ⚠️ Vencido
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-gray-500 font-medium">
                            Completado
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sale.status)}`}>
                        {getStatusIcon(sale.status)}
                        <span className="capitalize">
                          {sale.status === 'active' ? 'Activa' :
                           sale.status === 'completed' ? 'Completada' :
                           sale.status === 'overdue' ? 'Vencida' : 'Cancelada'}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onEditSale(sale)}
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteSale(sale.id)}
                          className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
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
        
        {installmentSales.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay ventas por abonos</h3>
            <p className="mt-1 text-sm text-gray-500">
              No se han registrado ventas por abonos aún.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}