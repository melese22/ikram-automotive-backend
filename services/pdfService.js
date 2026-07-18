const PDFDocument = require('pdfkit');

const COLORS = {
  primary: '#1a1a2e',
  accent: '#e94560',
  text: '#333333',
  lightText: '#777777',
  border: '#dddddd',
  headerBg: '#1a1a2e',
  rowAlt: '#f9f9f9',
};

function generateInvoicePDF(invoice, lineItems, workshop) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.rect(0, 0, doc.page.width, 80).fill(COLORS.headerBg);
    doc.fill('#ffffff').fontSize(22).font('Helvetica-Bold').text('IKRAM AUTOMOTIVE', 50, 25);
    doc.fontSize(9).font('Helvetica').text('Professional Auto Repair & EV Service', 50, 52);

    doc.fill(COLORS.text).fontSize(10).font('Helvetica-Bold').text('INVOICE', 400, 25, { align: 'right' });
    doc.fontSize(9).font('Helvetica').fill('#ffffff').text(invoice.invoice_number, 400, 40, { align: 'right' });
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 400, 52, { align: 'right' });

    doc.moveDown(4).fill(COLORS.text);
    const infoY = 110;

    doc.fontSize(9).font('Helvetica-Bold').fill(COLORS.lightText).text('BILL TO', 50, infoY);
    doc.fontSize(10).font('Helvetica-Bold').fill(COLORS.text).text(invoice.customer_name || 'N/A', 50, infoY + 15);
    doc.fontSize(9).font('Helvetica').text(invoice.customer_phone || '', 50, infoY + 30);
    doc.text(invoice.customer_email || '', 50, infoY + 42);

    doc.fontSize(9).font('Helvetica-Bold').fill(COLORS.lightText).text('VEHICLE', 300, infoY);
    doc.fontSize(10).font('Helvetica').fill(COLORS.text).text(`${invoice.make || ''} ${invoice.model || ''}`, 300, infoY + 15);
    doc.fontSize(9).text(`Plate: ${invoice.plate_number || 'N/A'}`, 300, infoY + 30);

    doc.fontSize(9).font('Helvetica-Bold').fill(COLORS.lightText).text('STATUS', 450, infoY);
    doc.fontSize(10).font('Helvetica-Bold').fill(COLORS.accent).text(invoice.status || 'DRAFT', 450, infoY + 15);

    let tableY = infoY + 80;
    const colWidths = { desc: 250, type: 80, qty: 50, price: 70, total: 70 };
    const colX = { desc: 50, type: 300, qty: 380, price: 430, total: 500 };

    doc.rect(50, tableY, doc.page.width - 100, 22).fill(COLORS.primary);
    doc.fill('#ffffff').fontSize(8).font('Helvetica-Bold');
    doc.text('DESCRIPTION', colX.desc + 5, tableY + 7);
    doc.text('TYPE', colX.type + 5, tableY + 7);
    doc.text('QTY', colX.qty + 5, tableY + 7);
    doc.text('UNIT PRICE', colX.price + 5, tableY + 7);
    doc.text('TOTAL', colX.total + 5, tableY + 7);
    tableY += 22;

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      const rowH = 20;

      if (i % 2 === 1) {
        doc.rect(50, tableY, doc.page.width - 100, rowH).fill(COLORS.rowAlt);
      }

      doc.fill(COLORS.text).fontSize(9).font('Helvetica');
      doc.text(item.description || '', colX.desc + 5, tableY + 5, { width: colWidths.desc - 10, ellipsis: true });
      doc.text(item.item_type || '', colX.type + 5, tableY + 5);
      doc.text(String(item.quantity || 0), colX.qty + 5, tableY + 5);
      doc.text(`ETB ${(item.unit_price || 0).toLocaleString()}`, colX.price + 5, tableY + 5);
      doc.text(`ETB ${(item.total || 0).toLocaleString()}`, colX.total + 5, tableY + 5);

      tableY += rowH;
    }

    tableY += 10;
    const summaryX = 380;
    const summaryW = 170;

    doc.fontSize(9).font('Helvetica').fill(COLORS.text);
    doc.text('Subtotal:', summaryX, tableY, { width: 80, align: 'right' });
    doc.text(`ETB ${(invoice.subtotal || 0).toLocaleString()}`, summaryX + 85, tableY, { width: 80, align: 'right' });
    tableY += 18;

    doc.text(`Tax (${invoice.tax_rate || 0}%):`, summaryX, tableY, { width: 80, align: 'right' });
    doc.text(`ETB ${(invoice.tax_amount || 0).toLocaleString()}`, summaryX + 85, tableY, { width: 80, align: 'right' });
    tableY += 22;

    doc.rect(summaryX, tableY, summaryW, 24).fill(COLORS.primary);
    doc.fill('#ffffff').fontSize(11).font('Helvetica-Bold');
    doc.text('TOTAL:', summaryX + 5, tableY + 6, { width: 80, align: 'right' });
    doc.text(`ETB ${(invoice.total || 0).toLocaleString()}`, summaryX + 85, tableY + 6, { width: 80, align: 'right' });

    if (parseFloat(invoice.deposit_paid) > 0) {
      tableY += 30;
      doc.fill(COLORS.text).fontSize(9).font('Helvetica');
      doc.text('Deposit Paid:', summaryX, tableY, { width: 80, align: 'right' });
      doc.text(`ETB ${(invoice.deposit_paid || 0).toLocaleString()}`, summaryX + 85, tableY, { width: 80, align: 'right' });
      tableY += 18;
      doc.font('Helvetica-Bold').fill(COLORS.accent).text('Balance Due:', summaryX, tableY, { width: 80, align: 'right' });
      doc.text(`ETB ${(invoice.balance_due || 0).toLocaleString()}`, summaryX + 85, tableY, { width: 80, align: 'right' });
    }

    if (invoice.notes) {
      tableY += 45;
      doc.fontSize(9).font('Helvetica-Bold').fill(COLORS.lightText).text('NOTES', 50, tableY);
      doc.fontSize(9).font('Helvetica').fill(COLORS.text).text(invoice.notes, 50, tableY + 15, { width: 400 });
    }

    const footerY = doc.page.height - 50;
    doc.fontSize(8).font('Helvetica').fill(COLORS.lightText);
    doc.text('Thank you for your business!', 50, footerY, { align: 'center', width: doc.page.width - 100 });
    doc.text('Ikram Automotive — Professional Auto Repair & EV Service', 50, footerY + 12, { align: 'center', width: doc.page.width - 100 });

    doc.end();
  });
}

module.exports = { generateInvoicePDF };
