// Utilidad para generar recibos PDF profesionales
// NOTA: Este archivo requiere jspdf y jspdf-autotable instalados
// Instalar con: npm install jspdf jspdf-autotable

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReceiptData {
  businessName: string;
  clientName: string | null;
  date: string | null;
  startTime: string | null;
  services: Array<{
    name: string;
    price_rd: number;
    price_usd: number;
    duration_minutes: number;
  }>;
  totalPriceRD: number;
  totalPriceUSD: number;
  appointmentId: string;
}

export const generateReceiptPDF = (data: ReceiptData): void => {
  try {
    // Crear instancia de jsPDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Colores (valores RGB 0-255 convertidos a 0-1)
    const primaryColor = [0, 0, 0]; // Negro para logo/título
    const secondaryColor = [128, 128, 128]; // Gris para texto secundario

    // Logo/Título MiTurnow (texto simple por ahora)
    doc.setFontSize(20);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Mí Turnow', 105, 20, { align: 'center' });

    // Subtítulo
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text('Recibo de Cita', 105, 28, { align: 'center' });

    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 35, 190, 35);

    // Información del negocio
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Establecimiento:', 20, 45);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(data.businessName || 'N/A', 20, 52);

    // Información del cliente
    if (data.clientName) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Cliente: ${data.clientName}`, 20, 60);
    }

    // Fecha y hora
    let yPos = 67;
    if (data.date || data.startTime) {
      const dateStr = data.date ? new Date(data.date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : '';
      const timeStr = data.startTime || '';
      doc.setFontSize(11);
      doc.text(`Fecha: ${dateStr}${dateStr && timeStr ? ' - ' : ''}${timeStr}`, 20, yPos);
      yPos += 7;
    }

    // Línea separadora antes de la tabla
    doc.line(20, yPos + 2, 190, yPos + 2);
    yPos += 8;

    // Tabla de servicios
    const tableData = data.services.map(service => [
      service.name || 'Servicio',
      `${service.duration_minutes || 0} min`,
      `RD$ ${(service.price_rd || 0).toLocaleString()}`,
      `USD $${(service.price_usd || 0).toFixed(2)}`,
    ]);

    // Agregar fila de totales
    tableData.push([
      { content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      '',
      { content: `RD$ ${data.totalPriceRD.toLocaleString()}`, styles: { fontStyle: 'bold' } },
      { content: `USD $${data.totalPriceUSD.toFixed(2)}`, styles: { fontStyle: 'bold' } },
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Servicio', 'Duración', 'Precio RD$', 'Precio USD$']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 11,
      },
      bodyStyles: {
        fontSize: 10,
        textColor: primaryColor,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        0: { cellWidth: 70 }, // Servicio
        1: { cellWidth: 30, halign: 'center' }, // Duración
        2: { cellWidth: 40, halign: 'right' }, // Precio RD$
        3: { cellWidth: 40, halign: 'right' }, // Precio USD$
      },
      margin: { left: 20, right: 20 },
    });

    // Obtener posición final después de la tabla
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;

    // Información adicional
    doc.setFontSize(9);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`ID de Cita: ${data.appointmentId}`, 20, finalY + 10);
    doc.text('Gracias por usar Mí Turnow', 105, finalY + 10, { align: 'center' });

    // Pie de página
    doc.setFontSize(8);
    doc.text(`Generado el ${new Date().toLocaleString('es-ES')}`, 105, 285, { align: 'center' });

    // Guardar PDF
    const fileName = `Recibo_MiTurnow_${data.appointmentId.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('[PDF] Error al generar recibo:', error);
    throw new Error('No se pudo generar el recibo PDF');
  }
};

