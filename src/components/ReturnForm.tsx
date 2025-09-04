import React, { useState, useEffect } from 'react';
import { X, Package, RotateCcw, AlertTriangle, DollarSign, FileText } from 'lucide-react';
import { returnService } from '../services/returnService';
import { saleService } from '../services/saleService';
import type { Return, Sale } from '../types';

interface ReturnFormProps {
  returnItem: Return | null;
  sale: Sale | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ReturnForm({ returnItem, sale, onSubmit, onCancel }: ReturnFormProps) {
  const [returnableItems, setReturnableItems] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    sale_item_id: '',
    product_id: '',
    quantity_returned: 1,
    reason: '',
    return_type: 'refund' as 'refund' | 'exchange' | 'warranty',
    condition: 'good' as 'excellent' | 'good' | 'fair' | 'poor' | 'damaged',
    refund_amount: 0,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sale) {
      loadReturnableItems();
    }
    if (returnItem) {
      setFormData({
        sale_item_id: returnItem.sale_item_id,
        product_id: returnItem.product_id,
        quantity_returned: returnItem.quantity_returned,
        reason: returnItem.reason,
        return_type: returnItem.return_type,
        condition: returnItem.condition,
        refund_amount: returnItem.refund_amount,
        notes: returnItem.notes
      });
    }
  }, [sale, returnItem]);

  const loadReturnableItems = async () => {
    if (!sale) return;
    
    try {
      const items = await returnService.getReturnableItems(sale.id);
      setReturnableItems(items);
      
      // Si solo hay un item disponible, seleccionarlo automáticamente
      if (items.length === 1 && !returnItem) {
        const item = items[0];
        setFormData(prev => ({
          ...prev,
          sale_item_id: item.sale_item_id,
          product_id: item.product_id,
          refund_amount: item.unit_price
        }));
      }
    } catch (error) {
      console.error('Error loading returnable items:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!sale) throw new Error('Venta no encontrada');

      const returnData = {
        sale_id: sale.id,
        sale_item_id: formData.sale_item_id,
        product_id: formData.product_id,
        customer_id: sale.customer_id,
        quantity_returned: formData.quantity_returned,
        reason: formData.reason,
        return_type: formData.return_type,
        condition: formData.condition,
        refund_amount: formData.refund_amount,
        notes: formData.notes
      };

      if (returnItem) {
        await returnService.update(returnItem.id, returnData);
      } else {
        await returnService.create(returnData);
      }

      onSubmit();
    } catch (err: any) {
      setError(err.message || 'Error al procesar la devolución');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Calcular refund automáticamente cuando cambia el item o cantidad
    if (name === 'sale_item_id' || name === 'quantity_returned') {
      const selectedItem = returnableItems.find(item => item.sale_item_id === (name === 'sale_item_id' ? value : formData.sale_item_id));
      if (selectedItem) {
        const quantity = name === 'quantity_returned' ? parseInt(value) : formData.quantity_returned;
        const refundAmount = selectedItem.unit_price * quantity;
        setFormData(prev => ({
          ...prev,
          product_id: selectedItem.product_id,
          refund_amount: refundAmount
        }));
      }
    }
  };

  const selectedItem = returnableItems.find(item => item.sale_item_id === formData.sale_item_id);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <RotateCcw className="h-5 w-5 text-blue-600" />
            <span>{returnItem ? 'Editar Devolución' : 'Nueva Devolución'}</span>
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Información de la venta */}
          {sale && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Información de la Venta</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Venta ID:</span>
                  <span className="ml-2 font-mono">{sale.id.slice(0, 8)}...</span>
                </div>
                <div>
                  <span className="text-blue-700">Cliente:</span>
                  <span className="ml-2">{sale.customer?.name || sale.customer_name}</span>
                </div>
                <div>
                  <span className="text-blue-700">Fecha:</span>
                  <span className="ml-2">{new Date(sale.created_at).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-blue-700">Total:</span>
                  <span className="ml-2 font-medium">${sale.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="sale_item_id" className="block text-sm font-medium text-gray-700 mb-2">
                Producto a Devolver *
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  id="sale_item_id"
                  name="sale_item_id"
                  value={formData.sale_item_id}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={!!returnItem}
                >
                  <option value="">Seleccionar producto</option>
                  {returnableItems.map(item => (
                    <option key={item.sale_item_id} value={item.sale_item_id}>
                      {item.product_name} (Disponible: {item.quantity_available})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="quantity_returned" className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad a Devolver *
              </label>
              <input
                type="number"
                id="quantity_returned"
                name="quantity_returned"
                value={formData.quantity_returned}
                onChange={handleChange}
                min="1"
                max={selectedItem?.quantity_available || 1}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              {selectedItem && (
                <p className="text-xs text-gray-500 mt-1">
                  Máximo disponible: {selectedItem.quantity_available}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="return_type" className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Devolución *
              </label>
              <select
                id="return_type"
                name="return_type"
                value={formData.return_type}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="refund">💰 Reembolso</option>
                <option value="exchange">🔄 Intercambio</option>
                <option value="warranty">🛡️ Garantía</option>
              </select>
            </div>

            <div>
              <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-2">
                Condición del Producto *
              </label>
              <div className="relative">
                <AlertTriangle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  id="condition"
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="excellent">⭐ Excelente</option>
                  <option value="good">✅ Buena</option>
                  <option value="fair">⚠️ Regular</option>
                  <option value="poor">❌ Mala</option>
                  <option value="damaged">💥 Dañado</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de la Devolución *
              </label>
              <select
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Seleccionar motivo</option>
                <option value="Producto defectuoso">🔧 Producto defectuoso</option>
                <option value="No cumple expectativas">😞 No cumple expectativas</option>
                <option value="Producto incorrecto">📦 Producto incorrecto</option>
                <option value="Cambio de opinión">💭 Cambio de opinión</option>
                <option value="Garantía">🛡️ Reclamación de garantía</option>
                <option value="Daño en envío">📮 Daño en envío</option>
                <option value="Otro">❓ Otro motivo</option>
              </select>
            </div>

            {formData.return_type === 'refund' && (
              <div>
                <label htmlFor="refund_amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Monto a Reembolsar
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    id="refund_amount"
                    name="refund_amount"
                    value={formData.refund_amount}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {selectedItem && (
                  <p className="text-xs text-gray-500 mt-1">
                    Precio original: ${(selectedItem.unit_price * formData.quantity_returned).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            <div className="md:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notas Adicionales
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
                  placeholder="Detalles adicionales sobre la devolución..."
                />
              </div>
            </div>
          </div>

          {/* Información del producto seleccionado */}
          {selectedItem && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Detalles del Producto</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Producto:</span>
                  <span className="ml-2 font-medium">{selectedItem.product_name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Precio unitario:</span>
                  <span className="ml-2 font-medium">${selectedItem.unit_price.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">Cantidad vendida:</span>
                  <span className="ml-2 font-medium">{selectedItem.quantity_sold}</span>
                </div>
                <div>
                  <span className="text-gray-600">Ya devuelto:</span>
                  <span className="ml-2 font-medium">{selectedItem.quantity_returned}</span>
                </div>
              </div>
            </div>
          )}

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
              disabled={loading || !formData.sale_item_id}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? 'Procesando...' : returnItem ? 'Actualizar Devolución' : 'Crear Devolución'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}