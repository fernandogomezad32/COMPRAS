import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import { supabase } from '../lib/supabase';
import type { Sale } from '../types';

export const invoiceService = {
  generateInvoice(sale: Sale): void {
    const doc = new jsPDF();
    
    // Configuración de la página
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let yPosition = 30;

    // Header de la empresa
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('VentasPro', margin, yPosition);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Ventas e Inventario', margin, yPosition + 8);
    doc.text('Tel: (555) 123-4567 | Email: info@ventaspro.com', margin, yPosition + 16);
    
    // Línea separadora
    yPosition += 30;
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 15;

    // Título de factura
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURA', pageWidth - margin - 40, yPosition);
    
    // Información de la factura
    yPosition += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Número: ${sale.invoice_number}`, pageWidth - margin - 80, yPosition);
    doc.text(`Fecha: ${new Date(sale.created_at).toLocaleDateString('es-ES')}`, pageWidth - margin - 80, yPosition + 8);
    doc.text(`Hora: ${new Date(sale.created_at).toLocaleTimeString('es-ES')}`, pageWidth - margin - 80, yPosition + 16);

    // Información del cliente
    yPosition += 30;
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE:', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(sale.customer?.name || sale.customer_name || 'Cliente Anónimo', margin, yPosition + 8);
    
    if (sale.customer?.email || sale.customer_email) {
      doc.text(`Email: ${sale.customer?.email || sale.customer_email}`, margin, yPosition + 16);
    }
    
    if (sale.customer?.phone) {
      doc.text(`Teléfono: ${sale.customer.phone}`, margin, yPosition + 24);
    }
    
    if (sale.customer?.address) {
      doc.text(`Dirección: ${sale.customer.address}`, margin, yPosition + 32);
      if (sale.customer.city) {
        doc.text(`${sale.customer.city}${sale.customer.postal_code ? `, ${sale.customer.postal_code}` : ''}`, margin, yPosition + 40);
      }
    }

    // Tabla de productos
    yPosition += 60;
    
    // Headers de la tabla
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 10, 'F');
    
    doc.text('Producto', margin + 5, yPosition + 7);
    doc.text('Cant.', margin + 100, yPosition + 7);
    doc.text('Precio Unit.', margin + 125, yPosition + 7);
    doc.text('Total', pageWidth - margin - 30, yPosition + 7);
    
    yPosition += 15;
    doc.setFont('helvetica', 'normal');

    // Items de la venta
    let itemsTotal = 0;
    if (sale.sale_items) {
      sale.sale_items.forEach((item) => {
        const itemTotal = item.unit_price * item.quantity;
        itemsTotal += itemTotal;
        
        doc.text(item.product?.name || 'Producto eliminado', margin + 5, yPosition);
        doc.text(item.quantity.toString(), margin + 100, yPosition);
        doc.text(`$${item.unit_price.toLocaleString()}`, margin + 125, yPosition);
        doc.text(`$${itemTotal.toLocaleString()}`, pageWidth - margin - 30, yPosition, { align: 'right' });
        
        yPosition += 8;
      });
    }

    // Línea separadora
    yPosition += 5;
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Totales
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', pageWidth - margin - 60, yPosition);
    doc.text(`$${sale.subtotal.toLocaleString()}`, pageWidth - margin - 30, yPosition, { align: 'right' });
    
    if (sale.discount_amount > 0) {
      yPosition += 8;
      doc.text(`Descuento (${sale.discount_type === 'percentage' ? sale.discount_percentage + '%' : 'Fijo'}):`, pageWidth - margin - 60, yPosition);
      doc.text(`-$${sale.discount_amount.toLocaleString()}`, pageWidth - margin - 30, yPosition, { align: 'right' });
    }
    
    yPosition += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', pageWidth - margin - 60, yPosition);
    doc.text(`$${sale.total.toLocaleString()}`, pageWidth - margin - 30, yPosition, { align: 'right' });

    // Información de pago
    yPosition += 20;
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DE PAGO:', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    
    const paymentMethods: Record<string, string> = {
      cash: '💵 Efectivo',
      card: '💳 Tarjeta',
      nequi: '📱 NEQUI',
      daviplata: '📱 DAVIPLATA',
      bancolombia: '📱 BANCOLOMBIA',
      transfer: '📱 Transferencia'
    };
    
    doc.text(`Método: ${paymentMethods[sale.payment_method] || sale.payment_method}`, margin, yPosition + 8);
    
    if (sale.amount_received > 0) {
      doc.text(`Recibido: $${sale.amount_received.toLocaleString()}`, margin, yPosition + 16);
      if (sale.change_amount > 0) {
        doc.text(`Cambio: $${sale.change_amount.toLocaleString()}`, margin, yPosition + 24);
      }
    }

    // Generar código de barras
    yPosition += 40;
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, sale.invoice_barcode, {
      format: 'CODE128',
      width: 2,
      height: 50,
      displayValue: true,
      fontSize: 12,
      textMargin: 5
    });
    
    // Convertir canvas a imagen y agregar al PDF
    const barcodeDataUrl = canvas.toDataURL('image/png');
    doc.addImage(barcodeDataUrl, 'PNG', margin, yPosition, 100, 25);
    
    // Texto del código de barras
    yPosition += 30;
    doc.setFontSize(10);
    doc.text(`Código de Factura: ${sale.invoice_barcode}`, margin, yPosition);

    // Footer
    yPosition += 20;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Gracias por su compra. Esta factura es válida como comprobante de pago.', margin, yPosition);
    doc.text(`Generado el ${new Date().toLocaleString('es-ES')}`, margin, yPosition + 8);

    // Descargar PDF
    const fileName = `Factura_${sale.invoice_number}_${sale.customer_name.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
  },

  async searchByBarcode(barcode: string): Promise<Sale | null> {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        customer:customers(*),
        sale_items(
          *,
          product:products(*),
          returns(*)
        )
      `)
      .eq('invoice_barcode', barcode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No encontrado
      }
      throw error;
    }
    return data;
  },

  async searchByInvoiceNumber(invoiceNumber: string): Promise<Sale | null> {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        customer:customers(*),
        sale_items(
          *,
          product:products(*),
          returns(*)
        )
      `)
      .eq('invoice_number', invoiceNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No encontrado
      }
      throw error;
    }
    return data;
  }
};