import React, { useState } from 'react';
import { X, DollarSign, Calendar, CreditCard, FileText } from 'lucide-react';
import { installmentService } from '../services/installmentService';
import type { InstallmentSale } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface InstallmentPaymentFormProps {
  installmentSale: InstallmentSale;
  onSubmit: () => void;
  onCancel: () => void;
}

export function InstallmentPaymentForm({ installmentSale, onSubmit, onCancel }: InstallmentPaymentFormProps) {
  const [formData, setFormData] = useState({
    amount: installmentSale.installment_amount.toString(),
    payment_method: 'cash' as 'cash' | 'card' | 'transfer' | 'nequi' | 'daviplata' | 'bancolombia',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const amount = parseFloat(formData.amount);

      if (amount <= 0) {
        throw new Error('El monto debe ser mayor a 0');
      }

      if (amount > installmentSale.remaining_amount) {
        throw new Error('El monto no puede ser mayor al saldo pendiente');
      }

      const newPaidAmount = installmentSale.paid_amount + amount;
      const percentagePaid = (newPaidAmount / installmentSale.total_amount) * 100;

      if (percentagePaid > 100) {
        throw new Error(`El pago excedería el 100% del total. Solo puede pagar hasta $${installmentSale.remaining_amount.toLocaleString()}`);
      }

      await installmentService.addPayment(installmentSale.id, {
        amount,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        notes: formData.notes
      });

      onSubmit();
    } catch (err: any) {
      setError(err.message || 'Error al registrar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const suggestedAmount = installmentSale.installment_amount;
  const remainingAmount = installmentSale.remaining_amount;
  const nextPaymentNumber = installmentSale.paid_installments + 1;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <span>Registrar Pago de Abono</span>
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Información de la venta */}
        <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-blue-900 mb-2">Información del Cliente</h3>
              <div className="text-sm text-blue-800">
                <div className="font-medium">{installmentSale.customer?.name}</div>
                <div>{installmentSale.customer?.email || installmentSale.customer?.phone}</div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-900 mb-2">Estado del Abono</h3>
              <div className="text-sm text-blue-800">
                <div>Abono #{nextPaymentNumber} de {installmentSale.installment_count}</div>
                <div>Saldo pendiente: ${remainingAmount.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Monto del Pago *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  step="0.01"
                  min="0.01"
                  max={remainingAmount}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="mt-2 space-y-1">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, amount: suggestedAmount.toString() }))}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Usar monto sugerido: ${suggestedAmount.toLocaleString()}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, amount: remainingAmount.toString() }))}
                  className="block text-xs text-green-600 hover:text-green-800"
                >
                  Pagar saldo completo: ${remainingAmount.toLocaleString()}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="payment_date" className="block text-sm font-medium text-gray-700 mb-2">
                Fecha del Pago *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  id="payment_date"
                  name="payment_date"
                  value={formData.payment_date}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pago *
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  id="payment_method"
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="cash">💵 Efectivo</option>
                  <option value="card">💳 Tarjeta</option>
                  <optgroup label="📱 Transferencias">
                    <option value="nequi">NEQUI</option>
                    <option value="daviplata">DAVIPLATA</option>
                    <option value="bancolombia">BANCOLOMBIA</option>
                    <option value="transfer">Otra Transferencia</option>
                  </optgroup>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notas del Pago
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Notas adicionales sobre este pago..."
                />
              </div>
            </div>
          </div>

          {/* Resumen del pago */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Resumen del Pago</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Número de abono:</span>
                <span className="ml-2 font-medium">#{nextPaymentNumber}</span>
              </div>
              <div>
                <span className="text-gray-600">Monto a pagar:</span>
                <span className="ml-2 font-bold text-green-600">
                  ${parseFloat(formData.amount || '0').toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Saldo después del pago:</span>
                <span className="ml-2 font-medium">
                  ${(remainingAmount - parseFloat(formData.amount || '0')).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Abonos restantes:</span>
                <span className="ml-2 font-medium">
                  {Math.max(0, installmentSale.installment_count - nextPaymentNumber)}
                </span>
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
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? 'Registrando...' : 'Registrar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}