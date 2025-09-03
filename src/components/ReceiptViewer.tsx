import React, { useEffect, useRef } from 'react';
import { X, Download, Printer, FileText, Calendar, User, Package } from 'lucide-react';
import type { PaymentReceipt } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import JsBarcode from 'jsbarcode';

interface ReceiptViewerProps {
  receipt: PaymentReceipt;
  onClose: () => void;
}

export function ReceiptViewer({ receipt, onClose }: ReceiptViewerProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && receipt.barcode) {
      JsBarcode(barcodeRef.current, receipt.barcode, {
        format: "CODE128",
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 12,
        margin: 10
      });
    }
  }, [receipt.barcode]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const printContent = document.getElementById('receipt-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comprobante ${receipt.receipt_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .receipt { max-width: 400px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
            .section { margin-bottom: 15px; }
            .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .total { border-top: 1px solid #000; padding-top: 10px; font-weight: bold; }
            .barcode { text-align: center; margin: 20px 0; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  if (!receipt.sale) return null;

  const sale = receipt.sale;
  const saleItems = sale.sale_items || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 print:hidden">
          <h2 className="text-xl font-semibold text-gray-900">
            Comprobante de Pago
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
              title="Descargar"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={handlePrint}
              className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-lg transition-colors"
              title="Imprimir"
            >
              <Printer className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div id="receipt-content" className="p-8">
          <div className="max-w-md mx-auto bg-white">
            {/* Header */}
            <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
              <h1 className="text-2xl font-bold text-gray-900">VentasPro</h1>
              <p className="text-sm text-gray-600">Sistema de Ventas e Inventario</p>
              <p className="text-xs text-gray-500 mt-2">Comprobante de Venta</p>
            </div>

            {/* Receipt Info */}
            <div className="mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Comprobante:</span>
                <span className="font-medium">{receipt.receipt_number_pr}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Fecha:</span>
                <span className="font-medium">
                  {format(new Date(receipt.issued_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Estado:</span>
                <span className={`font-medium ${
                  receipt.status === 'active' ? 'text-green-600' : 
                  receipt.status === 'voided' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {receipt.status === 'active' ? 'Activo' : 
                   receipt.status === 'voided' ? 'Anulado' : 'Cancelado'}
                </span>
              </div>
            </div>

            {/* Customer Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Cliente
              </h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nombre:</span>
                  <span>{sale.customer?.name || sale.customer_name || 'Cliente anónimo'}</span>
                </div>
                {(sale.customer?.email || sale.customer_email) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span>{sale.customer?.email || sale.customer_email}</span>
                  </div>
                )}
                {sale.customer?.phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Teléfono:</span>
                    <span>{sale.customer.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Productos
              </h3>
              <div className="space-y-2">
                {saleItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1">
                      <div className="font-medium">{item.product?.name || 'Producto eliminado'}</div>
                      <div className="text-gray-600">
                        ${item.unit_price.toLocaleString()} × {item.quantity}
                      </div>
                    </div>
                    <div className="font-medium">
                      ${item.total_price.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span>${sale.subtotal.toLocaleString()}</span>
              </div>
              
              {sale.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-red-600">
                    Descuento {sale.discount_type === 'percentage' ? `(${sale.discount_percentage}%)` : ''}:
                  </span>
                  <span className="text-red-600">-${sale.discount_amount.toLocaleString()}</span>
                </div>
              )}
              
              <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                <span>Total:</span>
                <span>${sale.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Información de Pago</h3>
              <div className="space-y-1 text-sm">
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
                      <span className="text-gray-600">
                        {sale.payment_method === 'cash' ? 'Recibido:' : 'Transferido:'}
                      </span>
                      <span>${sale.amount_received.toLocaleString()}</span>
                    </div>
                    {sale.change_amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cambio:</span>
                        <span className="text-orange-600">${sale.change_amount.toLocaleString()}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Barcode */}
            <div className="text-center mb-6">
              <div className="bg-white p-4 border border-gray-200 rounded-lg">
                <svg ref={barcodeRef} className="mx-auto"></svg>
                <p className="text-xs text-gray-500 mt-2">
                  Código: {receipt.barcode}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
              <p>¡Gracias por su compra!</p>
              <p className="mt-1">VentasPro - Sistema de Gestión</p>
              <p className="mt-1">
                Generado el {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}