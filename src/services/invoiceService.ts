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
    const margin = 15; // Reducido para más espacio
    let yPosition = 20; // Posición inicial más alta
    
    // Configurar tamaños de fuente optimizados para una página
    const sizes = {
      title: 16,
      subtitle: 12,
      header: 10,
      normal: 9,
      small: 8,
      tiny: 7
    };

    // === HEADER COMPACTO ===
    // Nombre de la empresa
    doc.setFontSize(sizes.title);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 62, 80);
    doc.text(config.company_name, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 6;
    
    // Información de contacto compacta
    doc.setFontSize(sizes.small);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    
    const contactLine1 = [];
    if (config.company_address) contactLine1.push(config.company_address);
    if (config.company_city) contactLine1.push(config.company_city);
    
    if (contactLine1.length > 0) {
      doc.text(contactLine1.join(', '), pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 4;
    }
    
    const contactLine2 = [];
    if (config.company_phone) contactLine2.push(`Tel: ${config.company_phone}`);
    if (config.company_email) contactLine2.push(`Email: ${config.company_email}`);
    
    if (contactLine2.length > 0) {
      doc.text(contactLine2.join(' | '), pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 4;
    }
    
    if (config.company_tax_id) {
      doc.text(`RFC: ${config.company_tax_id}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 4;
    }
    
    // Línea separadora
    yPosition += 5;
    doc.setDrawColor(52, 152, 219);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // === INFORMACIÓN DE FACTURA Y CLIENTE EN PARALELO ===
    const leftColumnX = margin;
    const rightColumnX = pageWidth - margin - 70;
    const sectionHeight = 25;
    
    // Recuadro de información de factura (derecha)
    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(200, 200, 200);
    doc.rect(rightColumnX, yPosition, 65, sectionHeight, 'FD');
    
    // Título FACTURA
    doc.setFontSize(sizes.subtitle);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 62, 80);
    doc.text('FACTURA', rightColumnX + 32.5, yPosition + 6, { align: 'center' });
    
    // Información de la factura
    doc.setFontSize(sizes.small);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    
    doc.text(`No. ${sale.invoice_number}`, rightColumnX + 2, yPosition + 12);
    doc.text(`Fecha: ${new Date(sale.created_at).toLocaleDateString('es-ES')}`, rightColumnX + 2, yPosition + 16);
    doc.text(`Hora: ${new Date(sale.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`, rightColumnX + 2, yPosition + 20);

    // Información del cliente (izquierda)
    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(200, 200, 200);
    doc.rect(leftColumnX, yPosition, pageWidth - 2 * margin - 70, sectionHeight, 'FD');
    
    doc.setFontSize(sizes.header);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 62, 80);
    doc.text('CLIENTE:', leftColumnX + 3, yPosition + 6);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sizes.normal);
    doc.setTextColor(60, 60, 60);
    doc.text(sale.customer?.name || sale.customer_name || 'Cliente Anonimo', leftColumnX + 3, yPosition + 12);
    
    if (sale.customer?.email || sale.customer_email) {
      doc.setFontSize(sizes.small);
      doc.text(`Email: ${sale.customer?.email || sale.customer_email}`, leftColumnX + 3, yPosition + 17);
    }
    
    if (sale.customer?.phone) {
      doc.setFontSize(sizes.small);
      doc.text(`Tel: ${sale.customer.phone}`, leftColumnX + 3, yPosition + 21);
    }

    yPosition += sectionHeight + 8;

    // === TABLA DE PRODUCTOS COMPACTA ===
    // Header de la tabla
    doc.setFillColor(52, 152, 219);
    doc.setDrawColor(52, 152, 219);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sizes.small);
    doc.setTextColor(255, 255, 255);
    
    doc.text('PRODUCTO', margin + 2, yPosition + 5);
    doc.text('CANT.', margin + 85, yPosition + 5, { align: 'center' });
    doc.text('PRECIO', margin + 115, yPosition + 5, { align: 'center' });
    doc.text('TOTAL', pageWidth - margin - 2, yPosition + 5, { align: 'right' });
    
    yPosition += 8;

    // Items de la venta (máximo espacio disponible)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sizes.small);
    doc.setTextColor(60, 60, 60);
    
    let rowIndex = 0;
    const maxRows = 12; // Limitar filas para que quepa todo
    const itemsToShow = sale.sale_items?.slice(0, maxRows) || [];
    
    itemsToShow.forEach((item) => {
      const itemTotal = item.unit_price * item.quantity;
      
      // Fondo alternado
      if (rowIndex % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 6, 'F');
      }
      
      // Truncar nombre del producto
      const productName = item.product?.name || 'Producto eliminado';
      const maxNameLength = 35;
      const truncatedName = productName.length > maxNameLength 
        ? productName.substring(0, maxNameLength) + '...'
        : productName;
      
      doc.text(truncatedName, margin + 2, yPosition + 4);
      doc.text(item.quantity.toString(), margin + 85, yPosition + 4, { align: 'center' });
      doc.text(`$${item.unit_price.toLocaleString()}`, margin + 115, yPosition + 4, { align: 'center' });
      doc.text(`$${itemTotal.toLocaleString()}`, pageWidth - margin - 2, yPosition + 4, { align: 'right' });
      
      yPosition += 6;
      rowIndex++;
    });

    // Si hay más productos, mostrar indicador
    if (sale.sale_items && sale.sale_items.length > maxRows) {
      doc.setFontSize(sizes.tiny);
      doc.setTextColor(120, 120, 120);
      doc.text(`... y ${sale.sale_items.length - maxRows} productos mas`, margin + 2, yPosition + 3);
      yPosition += 6;
    }

    // === TOTALES COMPACTOS ===
    yPosition += 5;
    
    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin + 80, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;

    // Totales en columna derecha
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sizes.small);
    doc.setTextColor(80, 80, 80);
    
    const totalsX = pageWidth - margin - 60;
    
    doc.text('Subtotal:', totalsX, yPosition);
    doc.text(`$${sale.subtotal.toLocaleString()}`, pageWidth - margin - 2, yPosition, { align: 'right' });
    
    // Descuento si aplica
    if (sale.discount_amount > 0) {
      yPosition += 5;
      const discountText = sale.discount_type === 'percentage' 
        ? `Descuento (${sale.discount_percentage}%):`
        : 'Descuento:';
      
      doc.setTextColor(231, 76, 60);
      doc.text(discountText, totalsX, yPosition);
      doc.text(`-$${sale.discount_amount.toLocaleString()}`, pageWidth - margin - 2, yPosition, { align: 'right' });
      doc.setTextColor(80, 80, 80);
    }
    
    // Total final destacado
    yPosition += 8;
    doc.setFillColor(52, 152, 219);
    doc.rect(totalsX - 5, yPosition - 3, 65, 10, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sizes.normal);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL:', totalsX, yPosition + 3);
    doc.text(`$${sale.total.toLocaleString()}`, pageWidth - margin - 2, yPosition + 3, { align: 'right' });

    // === INFORMACIÓN DE PAGO COMPACTA ===
    yPosition += 15;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sizes.small);
    doc.setTextColor(44, 62, 80);
    doc.text('PAGO:', margin, yPosition);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    
    const paymentMethods: Record<string, string> = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      nequi: 'NEQUI',
      daviplata: 'DAVIPLATA',
      bancolombia: 'BANCOLOMBIA',
      transfer: 'Transferencia'
    };
    
    // Información de pago en líneas separadas para mejor legibilidad
    doc.text(`Metodo: ${paymentMethods[sale.payment_method] || sale.payment_method}`, margin + 25, yPosition);
    
    if (sale.amount_received > 0) {
      yPosition += 4;
      doc.text(`Monto recibido: $${sale.amount_received.toLocaleString()}`, margin + 25, yPosition);
      
      if (sale.change_amount > 0) {
        yPosition += 4;
        doc.setTextColor(255, 140, 0); // Color naranja para el cambio
        doc.text(`Cambio devuelto: $${sale.change_amount.toLocaleString()}`, margin + 25, yPosition);
        doc.setTextColor(80, 80, 80); // Volver al color normal
      }
    }

    // === CÓDIGO DE BARRAS OPTIMIZADO ===
    yPosition += 12;
    
    // Generar código de barras en canvas
    const canvas = document.createElement('canvas');
    canvas.width = 400; // Ancho fijo para mejor calidad
    canvas.height = 80; // Altura fija
    
    try {
      JsBarcode(canvas, sale.invoice_barcode, {
        format: 'CODE128',
        width: 2,
        height: 50,
        displayValue: false, // No mostrar texto en el código
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000'
      });
      
      // Convertir a imagen y agregar al PDF
      const barcodeDataUrl = canvas.toDataURL('image/png');
      const barcodeWidth = 80; // Ancho en el PDF
      const barcodeHeight = 20; // Altura en el PDF
      const barcodeX = (pageWidth - barcodeWidth) / 2; // Centrar horizontalmente
      
      // Título del código de barras
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(sizes.small);
      doc.setTextColor(44, 62, 80);
      doc.text('CODIGO DE BARRAS', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 6;
      
      // Insertar imagen del código de barras
      doc.addImage(barcodeDataUrl, 'PNG', barcodeX, yPosition, barcodeWidth, barcodeHeight);
      
      yPosition += barcodeHeight + 3;
      
      // Número del código de barras debajo
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(sizes.small);
      doc.setTextColor(100, 100, 100);
      doc.text(sale.invoice_barcode, pageWidth / 2, yPosition, { align: 'center' });
      
    } catch (error) {
      console.error('Error generating barcode:', error);
      // Fallback: mostrar solo el número
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(sizes.small);
      doc.setTextColor(100, 100, 100);
      doc.text(`Codigo: ${sale.invoice_barcode}`, pageWidth / 2, yPosition, { align: 'center' });
    }

    yPosition += 8;

    // === FOOTER COMPACTO ===
    // Línea decorativa
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;
    
    // Texto del footer
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(sizes.tiny);
    doc.setTextColor(120, 120, 120);
    
    // Dividir footer en líneas si es muy largo
    const footerLines = doc.splitTextToSize(config.footer_text, pageWidth - 2 * margin);
    const maxFooterLines = 2; // Máximo 2 líneas para el footer
    const footerToShow = footerLines.slice(0, maxFooterLines);
    
    footerToShow.forEach((line: string, index: number) => {
      doc.text(line, pageWidth / 2, yPosition + (index * 4), { align: 'center' });
    });
    
    yPosition += footerToShow.length * 4 + 3;
    
    // Información de generación
    const generatedText = `Generada el ${new Date().toLocaleString('es-ES')}`;
    doc.text(generatedText, pageWidth / 2, yPosition, { align: 'center' });

    // === TÉRMINOS Y CONDICIONES (solo si hay espacio) ===
    if (config.terms_and_conditions && yPosition < pageHeight - 30) {
      yPosition += 8;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(sizes.tiny);
      doc.setTextColor(44, 62, 80);
      doc.text('TERMINOS Y CONDICIONES:', margin, yPosition);
      
      yPosition += 4;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      
      // Limitar términos a 2 líneas máximo
      const termsLines = doc.splitTextToSize(config.terms_and_conditions, pageWidth - 2 * margin);
      const maxTermsLines = 2;
      const termsToShow = termsLines.slice(0, maxTermsLines);
      
      termsToShow.forEach((line: string, index: number) => {
        doc.text(line, margin, yPosition + (index * 3));
      });
    }

    // Generar nombre del archivo
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