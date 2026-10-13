import PDFDocument from 'pdfkit';

// pdfkit's built-in fonts (Helvetica etc.) can't render the ₹ glyph, so the
// invoice uses "Rs." instead of printing a broken symbol.
const money = (n) =>
  `Rs. ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const COLS = { item: 50, size: 280, qty: 350, price: 400, total: 480 };

const drawTableHeader = (doc, y) => {
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#5A5647');
  doc.text('ITEM', COLS.item, y);
  doc.text('SIZE', COLS.size, y);
  doc.text('QTY', COLS.qty, y);
  doc.text('PRICE', COLS.price, y, { width: 70, align: 'right' });
  doc.text('TOTAL', COLS.total, y, { width: 65, align: 'right' });
  doc.moveTo(50, y + 15).lineTo(545, y + 15).strokeColor('#C7C0AC').stroke();
  return y + 25;
};

export const streamInvoicePdf = (order, res) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(res);

  // --- Header ---
  doc.font('Helvetica-Bold').fontSize(22).fillColor('#18160F').text('PRESENSE', 50, 50);
  doc.font('Helvetica').fontSize(10).fillColor('#5A5647').text('TAX INVOICE', 400, 56, { width: 145, align: 'right' });

  // --- Invoice meta ---
  doc.moveTo(50, 90).lineTo(545, 90).strokeColor('#18160F').stroke();
  doc.font('Helvetica').fontSize(10).fillColor('#18160F');
  doc.text(`Invoice No: INV-${order.orderCode}`, 50, 105);
  doc.text(`Order ID: ${order.orderCode}`, 50, 120);
  doc.text(`Order Date: ${formatDate(order.createdAt)}`, 50, 135);
  doc.text(`Payment: Cash on Delivery`, 50, 150);

  // --- Ship to ---
  const a = order.shippingAddress;
  doc.font('Helvetica-Bold').text('Ship to', 350, 105);
  doc.font('Helvetica').fillColor('#5A5647');
  doc.text(a.fullName, 350, 120);
  doc.text(`${a.line1}${a.line2 ? ', ' + a.line2 : ''}`, 350, 134, { width: 195 });
  doc.text(`${a.city}, ${a.state} - ${a.pincode}`, 350, doc.y);
  doc.text(a.country, 350, doc.y);
  doc.text(`Phone: ${a.phone}`, 350, doc.y);

  // --- Items table (only items still active on the order) ---
  const activeItems = order.items.filter((i) => i.status === 'active');
  let y = Math.max(doc.y, 175) + 25;
  y = drawTableHeader(doc, y);

  doc.font('Helvetica').fontSize(10).fillColor('#18160F');
  for (const item of activeItems) {
    if (y > 720) {
      doc.addPage();
      y = drawTableHeader(doc, 50);
      doc.font('Helvetica').fontSize(10).fillColor('#18160F');
    }
    doc.text(item.name, COLS.item, y, { width: 220 });
    doc.text(item.size, COLS.size, y);
    doc.text(String(item.quantity), COLS.qty, y);
    doc.text(money(item.price), COLS.price - 20, y, { width: 90, align: 'right' });
    doc.text(money(item.lineTotal), COLS.total - 20, y, { width: 85, align: 'right' });
    y += 24;
  }

  // --- Totals ---
  if (y > 640) { doc.addPage(); y = 50; }
  y += 10;
  doc.moveTo(300, y).lineTo(545, y).strokeColor('#C7C0AC').stroke();
  y += 12;

  const p = order.pricing;
  const row = (label, value, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 12 : 10).fillColor('#18160F');
    doc.text(label, 300, y, { width: 120 });
    doc.text(value, 420, y, { width: 125, align: 'right' });
    y += bold ? 22 : 18;
  };

  row('Subtotal', money(p.subtotal));
  row('Tax', money(p.tax));
  if (p.discount > 0) row(order.couponCode ? `Discount (${order.couponCode})` : 'Discount', `- ${money(p.discount)}`);
  row('Shipping', p.shippingFee === 0 ? 'Free' : money(p.shippingFee));
  doc.moveTo(300, y).lineTo(545, y).strokeColor('#18160F').stroke();
  y += 8;
  row('Total', money(p.total), true);

  if (activeItems.length !== order.items.length) {
    doc.font('Helvetica-Oblique').fontSize(8).fillColor('#5A5647')
      .text('Items cancelled after the order was placed are not listed above.', 50, y + 10);
  }

  // --- Footer ---
  doc.font('Helvetica').fontSize(9).fillColor('#5A5647')
    .text('Thank you for shopping with Presense.', 50, 780, { width: 495, align: 'center' });

  doc.end();
};