import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import { supabase } from '../lib/supabase';
import { invoiceConfigService } from './invoiceConfigService';
import type { Sale } from '../types';

export const invoiceService = {
  async generateInvoice(sale: Sale): Promise<void> {
    // Cargar configuración de factura
    const config = await invoiceConfigService.getOrCreateDefault();
    
    const doc = new jsPDF();
    
    // Configuración de la página
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let yPosition = 30;
    
    // Configurar tamaños de fuente según configuración
    const fontSizes = {
      small: { title: 20, header: 10, normal: 8, large: 14 },
      medium: { title: 24, header: 12, normal: 10, large: 16 },
      large: { title: 28, header: 14, normal: 12, large: 18 }
    };
    
    const sizes = fontSizes[config.font_size];

    // Header de la empresa
    doc.setFontSize(sizes.title);
    doc.setFont('helvetica', 'bold');
    doc.text(config.company_name, margin, yPosition);
    
    doc.setFontSize(sizes.header);
    doc.setFont('helvetica', 'normal');
    
    if (config.company_address) {
      doc.text(config.company_address, margin, yPosition + 8);
      yPosition += 8;
    }
    
    if (config.company_city) {
      doc.text(config.company_city, margin, yPosition + 8);
      yPosition += 8;
    }
    
    const contactInfo = [];
    if (config.company_phone) contactInfo.push(`Tel: ${config.company_phone}`);
    if (config.company_email) contactInfo.push(`Email: ${config.company_email}`);
    if (config.company_website) contactInfo.push(config.company_website);
    
    if (contactInfo.length > 0) {
      doc.text(contactInfo.join(' | '), margin, yPosition + 8);
      yPosition += 8;
    }
    
    if (config.company_tax_id) {
      doc.text(`RFC/ID Fiscal: ${config.company_tax_id}`, margin, yPosition + 8);
      yPosition += 8;
    }
    
    // Línea separadora
    yPosition += 20;
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 15;
    
    // Código de barras en la parte superior si está configurado
    if (config.show_barcode && config.barcode_position === 'top') {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, sale.invoice_barcode, {
        format: 'CODE128',
        width: 2,
        height: 40,
        displayValue: true,
        fontSize: sizes.normal,
        textMargin: 5
      });
      
      const barcodeDataUrl = canvas.toDataURL('image/png');
      doc.addImage(barcodeDataUrl, 'PNG', margin, yPosition, 80, 20);
      yPosition += 25;
    }

    // Título de factura
    doc.setFontSize(sizes.large);
    doc.setFont('helvetica', 'bold');
    const invoiceTitle = config.language === 'es' ? 'FACTURA' : 'INVOICE';
    doc.text(invoiceTitle, pageWidth - margin - 40, yPosition);
    
    // Información de la factura
    yPosition += 15;
    doc.setFontSize(sizes.header);
    doc.setFont('helvetica', 'normal');
    const numberLabel = config.language === 'es' ? 'Número:' : 'Number:';
    const dateLabel = config.language === 'es' ? 'Fecha:' : 'Date:';
    const timeLabel = config.language === 'es' ? 'Hora:' : 'Time:';
    
    doc.text(`${numberLabel} ${sale.invoice_number}`, pageWidth - margin - 80, yPosition);
    doc.text(`${dateLabel} ${new Date(sale.created_at).toLocaleDateString(config.language === 'es' ? 'es-ES' : 'en-US')}`, pageWidth - margin - 80, yPosition + 8);
    doc.text(`${timeLabel} ${new Date(sale.created_at).toLocaleTimeString(config.language === 'es' ? 'es-ES' : 'en-US')}`, pageWidth - margin - 80, yPosition + 16);

    // Información del cliente
    yPosition += 30;
    doc.setFont('helvetica', 'bold');
    const clientLabel = config.language === 'es' ? 'CLIENTE:' : 'CUSTOMER:';
    doc.text(clientLabel, margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(sale.customer?.name || sale.customer_name || (config.language === 'es' ? 'Cliente Anónimo' : 'Anonymous Customer'), margin, yPosition + 8);
    
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
    doc.setFontSize(sizes.normal);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 10, 'F');
    
    const headers = config.language === 'es' 
      ? ['Producto', 'Cant.', 'Precio Unit.', 'Total']
      : ['Product', 'Qty.', 'Unit Price', 'Total'];
    
    doc.text(headers[0], margin + 5, yPosition + 7);
    doc.text(headers[1], margin + 100, yPosition + 7);
    doc.text(headers[2], margin + 125, yPosition + 7);
    doc.text(headers[3], pageWidth - margin - 30, yPosition + 7);
    
    yPosition += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sizes.normal);

    // Items de la venta
    let itemsTotal = 0;
    if (sale.sale_items) {
      sale.sale_items.forEach((item) => {
        const itemTotal = item.unit_price * item.quantity;
        itemsTotal += itemTotal;
        
        doc.text(item.product?.name || (config.language === 'es' ? 'Producto eliminado' : 'Deleted product'), margin + 5, yPosition);
        doc.text(item.quantity.toString(), margin + 100, yPosition);
        doc.text(`${config.currency_symbol}${item.unit_price.toLocaleString()}`, margin + 125, yPosition);
        doc.text(`${config.currency_symbol}${itemTotal.toLocaleString()}`, pageWidth - margin - 30, yPosition, { align: 'right' });
        
        yPosition += 8;
      });
    }

    // Línea separadora
    yPosition += 5;
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Totales
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sizes.normal);
    
    const subtotalLabel = config.language === 'es' ? 'Subtotal:' : 'Subtotal:';
    doc.text(subtotalLabel, pageWidth - margin - 60, yPosition);
    doc.text(`${config.currency_symbol}${sale.subtotal.toLocaleString()}`, pageWidth - margin - 30, yPosition, { align: 'right' });
    
    if (sale.discount_amount > 0) {
      yPosition += 8;
      const discountLabel = config.language === 'es' 
        ? `Descuento (${sale.discount_type === 'percentage' ? sale.discount_percentage + '%' : 'Fijo'}):`
        : `Discount (${sale.discount_type === 'percentage' ? sale.discount_percentage + '%' : 'Fixed'}):`;
      doc.text(discountLabel, pageWidth - margin - 60, yPosition);
      doc.text(`-${config.currency_symbol}${sale.discount_amount.toLocaleString()}`, pageWidth - margin - 30, yPosition, { align: 'right' });
    }
    
    // Impuestos si están habilitados
    if (config.include_tax && config.tax_rate > 0) {
      yPosition += 8;
      const taxAmount = (sale.subtotal - (sale.discount_amount || 0)) * (config.tax_rate / 100);
      const taxLabel = config.language === 'es' ? `Impuesto (${config.tax_rate}%):` : `Tax (${config.tax_rate}%):`;
      doc.text(taxLabel, pageWidth - margin - 60, yPosition);
      doc.text(`${config.currency_symbol}${taxAmount.toLocaleString()}`, pageWidth - margin - 30, yPosition, { align: 'right' });
    }
    
    yPosition += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sizes.large);
    const totalLabel = config.language === 'es' ? 'TOTAL:' : 'TOTAL:';
    doc.text(totalLabel, pageWidth - margin - 60, yPosition);
    doc.text(`${config.currency_symbol}${sale.total.toLocaleString()}`, pageWidth - margin - 30, yPosition, { align: 'right' });

    // Información de pago
    yPosition += 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sizes.header);
    const paymentInfoLabel = config.language === 'es' ? 'INFORMACIÓN DE PAGO:' : 'PAYMENT INFORMATION:';
    doc.text(paymentInfoLabel, margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sizes.normal);
    
    const paymentMethods: Record<string, string> = {
      cash: config.language === 'es' ? '💵 Efectivo' : '💵 Cash',
      card: config.language === 'es' ? '💳 Tarjeta' : '💳 Card',
      nequi: '📱 NEQUI',
      daviplata: '📱 DAVIPLATA',
      bancolombia: '📱 BANCOLOMBIA',
      transfer: config.language === 'es' ? '📱 Transferencia' : '📱 Transfer'
    };
    
    const methodLabel = config.language === 'es' ? 'Método:' : 'Method:';
    doc.text(`${methodLabel} ${paymentMethods[sale.payment_method] || sale.payment_method}`, margin, yPosition + 8);
    
    if (sale.amount_received > 0) {
      const receivedLabel = config.language === 'es' ? 'Recibido:' : 'Received:';
      doc.text(`${receivedLabel} ${config.currency_symbol}${sale.amount_received.toLocaleString()}`, margin, yPosition + 16);
      if (sale.change_amount > 0) {
        const changeLabel = config.language === 'es' ? 'Cambio:' : 'Change:';
        doc.text(`${changeLabel} ${config.currency_symbol}${sale.change_amount.toLocaleString()}`, margin, yPosition + 24);
      }
    }

    // Términos y condiciones
    if (config.terms_and_conditions) {
      yPosition += 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(sizes.normal);
      const termsLabel = config.language === 'es' ? 'TÉRMINOS Y CONDICIONES:' : 'TERMS AND CONDITIONS:';
      doc.text(termsLabel, margin, yPosition);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(sizes.normal - 1);
      const lines = doc.splitTextToSize(config.terms_and_conditions, pageWidth - 2 * margin);
      doc.text(lines, margin, yPosition + 8);
      yPosition += 8 + (lines.length * 4);
    }
    
    // Generar código de barras en la parte inferior si está configurado
    if (config.show_barcode && config.barcode_position === 'bottom') {
      yPosition += 20;
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, sale.invoice_barcode, {
        format: 'CODE128',
        width: 2,
        height: 50,
        displayValue: true,
        fontSize: sizes.normal,
        textMargin: 5
      });
      
      // Convertir canvas a imagen y agregar al PDF
      const barcodeDataUrl = canvas.toDataURL('image/png');
      doc.addImage(barcodeDataUrl, 'PNG', margin, yPosition, 100, 25);
      
      // Texto del código de barras
      yPosition += 30;
      doc.setFontSize(sizes.normal - 1);
      const barcodeLabel = config.language === 'es' ? 'Código de Factura:' : 'Invoice Code:';
      doc.text(`${barcodeLabel} ${sale.invoice_barcode}`, margin, yPosition);
    }

    // Footer
    yPosition += 20;
    doc.setFontSize(sizes.normal - 2);
    doc.setFont('helvetica', 'italic');
    doc.text(config.footer_text, margin, yPosition);
    
    const generatedLabel = config.language === 'es' ? 'Generado el' : 'Generated on';
    const locale = config.language === 'es' ? 'es-ES' : 'en-US';
    doc.text(`${generatedLabel} ${new Date().toLocaleString(locale)}`, margin, yPosition + 8);

    // Descargar PDF
    const customerName = (sale.customer?.name || sale.customer_name || 'Cliente_Anonimo').replace(/\s+/g, '_');
    const fileName = `${config.invoice_prefix}_${sale.invoice_number}_${customerName}.pdf`;
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