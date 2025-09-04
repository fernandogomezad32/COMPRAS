import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import { format } from 'date-fns';
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
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    let yPosition = 25;
    
    // Configurar tamaños de fuente según configuración
    const fontSizes = {
      small: { title: 18, subtitle: 14, header: 11, normal: 9, small: 8 },
      medium: { title: 22, subtitle: 16, header: 12, normal: 10, small: 9 },
      large: { title: 26, subtitle: 18, header: 14, normal: 12, small: 10 }
    };
    
    const sizes = fontSizes[config.font_size];

    // === HEADER DE LA EMPRESA ===
    // Logo si está configurado
    if (config.show_company_logo && config.company_logo_url) {
      try {
        // Aquí se podría cargar el logo, por ahora solo reservamos espacio
        yPosition += 30;
      } catch (error) {
        console.warn('No se pudo cargar el logo');
      }
    }

    // Nombre de la empresa
    doc.setFontSize(sizes.title);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 62, 80); // Color azul oscuro
    doc.text(config.company_name, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 8;
    
    // Información de contacto en una línea
    doc.setFontSize(sizes.normal);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    
    const contactInfo = [];
    if (config.company_address) contactInfo.push(config.company_address);
    if (config.company_city) contactInfo.push(config.company_city);
    if (contactInfo.length > 0) {
      doc.text(contactInfo.join(', '), pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;
    }
    
    const contactDetails = [];
    if (config.company_phone) contactDetails.push(`Tel: ${config.company_phone}`);
    if (config.company_email) contactDetails.push(`Email: ${config.company_email}`);
    if (config.company_website) contactDetails.push(config.company_website);
    
    if (contactDetails.length > 0) {
      doc.text(contactDetails.join(' | '), pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;
    }
    
    if (config.company_tax_id) {
      doc.text(`RFC/ID Fiscal: ${config.company_tax_id}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;
    }
    
    // Línea decorativa
    yPosition += 10;
    doc.setDrawColor(52, 152, 219); // Azul
    doc.setLineWidth(1);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 15;

    // === SECCIÓN DE FACTURA ===
    // Recuadro para información de factura
    doc.setFillColor(248, 249, 250); // Gris muy claro
    doc.setDrawColor(200, 200, 200);
    doc.rect(pageWidth - margin - 80, yPosition - 5, 75, 35, 'FD');
    
    // Título FACTURA
    doc.setFontSize(sizes.subtitle);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 62, 80);
    const invoiceTitle = config.language === 'es' ? 'FACTURA' : 'INVOICE';
    doc.text(invoiceTitle, pageWidth - margin - 42.5, yPosition + 5, { align: 'center' });
    
    // Información de la factura
    doc.setFontSize(sizes.normal);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    
    const numberLabel = config.language === 'es' ? 'No.' : 'No.';
    const dateLabel = config.language === 'es' ? 'Fecha' : 'Date';
    const timeLabel = config.language === 'es' ? 'Hora' : 'Time';
    
    doc.text(`${numberLabel} ${sale.invoice_number}`, pageWidth - margin - 75, yPosition + 12);
    doc.text(`${dateLabel}: ${new Date(sale.created_at).toLocaleDateString(config.language === 'es' ? 'es-ES' : 'en-US')}`, pageWidth - margin - 75, yPosition + 18);
    doc.text(`${timeLabel}: ${new Date(sale.created_at).toLocaleTimeString(config.language === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - margin - 75, yPosition + 24);

    // Código de barras en la parte superior si está configurado
    if (config.show_barcode && config.barcode_position === 'top') {
      yPosition += 45;
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, sale.invoice_barcode, {
        format: 'CODE128',
        width: 1.5,
        height: 30,
        displayValue: true,
        fontSize: sizes.small,
        textMargin: 3
      });
      
      const barcodeDataUrl = canvas.toDataURL('image/png');
      doc.addImage(barcodeDataUrl, 'PNG', pageWidth - margin - 70, yPosition, 65, 15);
      yPosition += 20;
    } else {
      yPosition += 40;
    }

    // === INFORMACIÓN DEL CLIENTE ===
    yPosition += 10;
    
    // Recuadro para cliente
    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 30, 'FD');
    
    doc.setFontSize(sizes.header);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 62, 80);
    const clientLabel = config.language === 'es' ? 'FACTURAR A:' : 'BILL TO:';
    doc.text(clientLabel, margin + 5, yPosition + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(sale.customer?.name || sale.customer_name || (config.language === 'es' ? 'Cliente Anónimo' : 'Anonymous Customer'), margin + 5, yPosition + 15);
    
    // Información adicional del cliente en columnas
    let clientInfoY = yPosition + 21;
    if (sale.customer?.email || sale.customer_email) {
      doc.setFontSize(sizes.small);
      doc.text(`Email: ${sale.customer?.email || sale.customer_email}`, margin + 5, clientInfoY);
      clientInfoY += 5;
    }
    
    if (sale.customer?.phone) {
      doc.setFontSize(sizes.small);
      doc.text(`Tel: ${sale.customer.phone}`, margin + 5, clientInfoY);
    }
    
    // Dirección en la columna derecha si existe
    if (sale.customer?.address) {
      doc.setFontSize(sizes.small);
      doc.text(`Dir: ${sale.customer.address}`, margin + 100, yPosition + 15);
      if (sale.customer.city) {
        doc.text(`${sale.customer.city}${sale.customer.postal_code ? `, ${sale.customer.postal_code}` : ''}`, margin + 100, yPosition + 21);
      }
    }

    yPosition += 40;

    // === TABLA DE PRODUCTOS ===
    // Header de la tabla con mejor diseño
    doc.setFillColor(52, 152, 219); // Azul
    doc.setDrawColor(52, 152, 219);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 12, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sizes.normal);
    doc.setTextColor(255, 255, 255); // Blanco
    
    const headers = config.language === 'es' 
      ? ['PRODUCTO', 'CANT.', 'PRECIO UNIT.', 'TOTAL']
      : ['PRODUCT', 'QTY.', 'UNIT PRICE', 'TOTAL'];
    
    doc.text(headers[0], margin + 5, yPosition + 8);
    doc.text(headers[1], margin + 110, yPosition + 8, { align: 'center' });
    doc.text(headers[2], margin + 135, yPosition + 8, { align: 'center' });
    doc.text(headers[3], pageWidth - margin - 5, yPosition + 8, { align: 'right' });
    
    yPosition += 12;

    // Items de la venta con líneas alternadas
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sizes.normal);
    doc.setTextColor(60, 60, 60);
    
    let itemsTotal = 0;
    let rowIndex = 0;
    
    if (sale.sale_items) {
      sale.sale_items.forEach((item) => {
        const itemTotal = item.unit_price * item.quantity;
        itemsTotal += itemTotal;
        
        // Fondo alternado para filas
        if (rowIndex % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, yPosition, pageWidth - 2 * margin, 10, 'F');
        }
        
        // Contenido de la fila
        const productName = item.product?.name || (config.language === 'es' ? 'Producto eliminado' : 'Deleted product');
        
        // Truncar nombre del producto si es muy largo
        const maxProductNameWidth = 100;
        const truncatedName = doc.getTextWidth(productName) > maxProductNameWidth 
          ? productName.substring(0, 30) + '...'
          : productName;
        
        doc.text(truncatedName, margin + 5, yPosition + 7);
        doc.text(item.quantity.toString(), margin + 110, yPosition + 7, { align: 'center' });
        doc.text(`${config.currency_symbol}${item.unit_price.toLocaleString()}`, margin + 135, yPosition + 7, { align: 'center' });
        doc.text(`${config.currency_symbol}${itemTotal.toLocaleString()}`, pageWidth - margin - 5, yPosition + 7, { align: 'right' });
        
        yPosition += 10;
        rowIndex++;
      });
    }

    // Línea separadora antes de totales
    yPosition += 5;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin + 100, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // === SECCIÓN DE TOTALES ===
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sizes.normal);
    doc.setTextColor(80, 80, 80);
    
    const subtotalLabel = config.language === 'es' ? 'Subtotal:' : 'Subtotal:';
    doc.text(subtotalLabel, pageWidth - margin - 60, yPosition);
    doc.text(`${config.currency_symbol}${sale.subtotal.toLocaleString()}`, pageWidth - margin - 5, yPosition, { align: 'right' });
    
    // Descuento si aplica
    if (sale.discount_amount > 0) {
      yPosition += 8;
      const discountLabel = config.language === 'es' 
        ? `Descuento ${sale.discount_type === 'percentage' ? `(${sale.discount_percentage}%)` : '(Fijo)'}:`
        : `Discount ${sale.discount_type === 'percentage' ? `(${sale.discount_percentage}%)` : '(Fixed)'}:`;
      
      doc.setTextColor(231, 76, 60); // Rojo para descuento
      doc.text(discountLabel, pageWidth - margin - 60, yPosition);
      doc.text(`-${config.currency_symbol}${sale.discount_amount.toLocaleString()}`, pageWidth - margin - 5, yPosition, { align: 'right' });
      doc.setTextColor(80, 80, 80); // Volver al color normal
    }
    
    // Impuestos si están habilitados
    if (config.include_tax && config.tax_rate > 0) {
      yPosition += 8;
      const taxAmount = (sale.subtotal - (sale.discount_amount || 0)) * (config.tax_rate / 100);
      const taxLabel = config.language === 'es' ? `Impuesto (${config.tax_rate}%):` : `Tax (${config.tax_rate}%):`;
      doc.text(taxLabel, pageWidth - margin - 60, yPosition);
      doc.text(`${config.currency_symbol}${taxAmount.toLocaleString()}`, pageWidth - margin - 5, yPosition, { align: 'right' });
    }
    
    // Línea antes del total
    yPosition += 5;
    doc.setDrawColor(52, 152, 219);
    doc.setLineWidth(1);
    doc.line(pageWidth - margin - 65, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
    
    // Total final con fondo destacado
    doc.setFillColor(52, 152, 219);
    doc.rect(pageWidth - margin - 70, yPosition - 3, 65, 12, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sizes.subtitle);
    doc.setTextColor(255, 255, 255); // Blanco
    const totalLabel = config.language === 'es' ? 'TOTAL:' : 'TOTAL:';
    doc.text(totalLabel, pageWidth - margin - 65, yPosition + 5);
    doc.text(`${config.currency_symbol}${sale.total.toLocaleString()}`, pageWidth - margin - 8, yPosition + 5, { align: 'right' });

    // === INFORMACIÓN DE PAGO ===
    yPosition += 25;
    
    // Recuadro para información de pago
    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 25, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sizes.header);
    doc.setTextColor(44, 62, 80);
    const paymentInfoLabel = config.language === 'es' ? 'INFORMACIÓN DE PAGO' : 'PAYMENT INFORMATION';
    doc.text(paymentInfoLabel, margin + 5, yPosition + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sizes.normal);
    doc.setTextColor(80, 80, 80);
    
    const paymentMethods: Record<string, string> = {
      cash: config.language === 'es' ? 'Efectivo' : 'Cash',
      card: config.language === 'es' ? 'Tarjeta' : 'Card',
      nequi: 'NEQUI',
      daviplata: 'DAVIPLATA',
      bancolombia: 'BANCOLOMBIA',
      transfer: config.language === 'es' ? 'Transferencia' : 'Transfer'
    };
    
    const methodLabel = config.language === 'es' ? 'Método de pago:' : 'Payment method:';
    doc.text(`${methodLabel} ${paymentMethods[sale.payment_method] || sale.payment_method}`, margin + 5, yPosition + 15);
    
    // Información de efectivo/transferencia
    if (sale.amount_received > 0) {
      const receivedLabel = config.language === 'es' ? 'Recibido:' : 'Received:';
      doc.text(`${receivedLabel} ${config.currency_symbol}${sale.amount_received.toLocaleString()}`, margin + 100, yPosition + 15);
      
      if (sale.change_amount > 0) {
        const changeLabel = config.language === 'es' ? 'Cambio:' : 'Change:';
        doc.text(`${changeLabel} ${config.currency_symbol}${sale.change_amount.toLocaleString()}`, margin + 100, yPosition + 21);
      }
    }

    yPosition += 35;

    // === CÓDIGO DE BARRAS ===
    if (config.show_barcode && config.barcode_position === 'bottom') {
      yPosition += 10;
      
      // Generar código de barras
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, sale.invoice_barcode, {
        format: 'CODE128',
        width: 1.5,
        height: 40,
        displayValue: true,
        fontSize: sizes.small,
        textMargin: 5,
        textAlign: 'center'
      });
      
      const barcodeDataUrl = canvas.toDataURL('image/png');
      const barcodeWidth = 80;
      const barcodeX = (pageWidth - barcodeWidth) / 2; // Centrar
      
      doc.addImage(barcodeDataUrl, 'PNG', barcodeX, yPosition, barcodeWidth, 20);
      yPosition += 25;
    }

    // === TÉRMINOS Y CONDICIONES ===
    if (config.terms_and_conditions) {
      yPosition += 10;
      
      doc.setFillColor(252, 252, 252);
      doc.setDrawColor(220, 220, 220);
      
      // Calcular altura necesaria para el texto
      const lines = doc.splitTextToSize(config.terms_and_conditions, pageWidth - 2 * margin - 10);
      const textHeight = lines.length * 4 + 10;
      
      doc.rect(margin, yPosition, pageWidth - 2 * margin, textHeight, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(sizes.normal);
      doc.setTextColor(44, 62, 80);
      const termsLabel = config.language === 'es' ? 'TÉRMINOS Y CONDICIONES' : 'TERMS AND CONDITIONS';
      doc.text(termsLabel, margin + 5, yPosition + 8);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(sizes.small);
      doc.setTextColor(100, 100, 100);
      doc.text(lines, margin + 5, yPosition + 15);
      
      yPosition += textHeight + 5;
    }

    // === FOOTER ===
    yPosition += 15;
    
    // Línea decorativa
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
    
    // Texto del footer
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(sizes.small);
    doc.setTextColor(120, 120, 120);
    doc.text(config.footer_text, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 8;
    
    // Información de generación
    const generatedLabel = config.language === 'es' ? 'Factura generada el' : 'Invoice generated on';
    const locale = config.language === 'es' ? 'es-ES' : 'en-US';
    const generatedText = `${generatedLabel} ${new Date().toLocaleString(locale)}`;
    doc.text(generatedText, pageWidth / 2, yPosition, { align: 'center' });

    // Verificar si necesitamos una nueva página
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = 30;
    }

    // === INFORMACIÓN ADICIONAL ===
    if (sale.customer?.tax_id || sale.customer?.customer_type === 'business') {
      yPosition += 15;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(sizes.small);
      doc.setTextColor(100, 100, 100);
      
      if (sale.customer.tax_id) {
        const taxIdLabel = config.language === 'es' ? 'RFC Cliente:' : 'Customer Tax ID:';
        doc.text(`${taxIdLabel} ${sale.customer.tax_id}`, margin, yPosition);
      }
    }

    // Descargar PDF con nombre descriptivo
    const customerName = (sale.customer?.name || sale.customer_name || 'Cliente_Anonimo')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '');
    const date = format(new Date(sale.created_at), 'yyyy-MM-dd');
    const fileName = `${config.invoice_prefix}_${sale.invoice_number}_${customerName}_${date}.pdf`;
    
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
      .maybeSingle();

    if (error) {
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
      .maybeSingle();

    if (error) {
      throw error;
    }
    
    return data;
  }
};