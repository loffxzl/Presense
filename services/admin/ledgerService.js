import PDFDocument from 'pdfkit';
import { TZ } from '../../utils/dashboardRange.js';

// Widths include a 6pt gutter. Sum = 724pt, inside A4 landscape's 762pt usable width.
const COLUMNS = [
    { key: 'date', label: 'Date', width: 62 },
    { key: 'orderCode', label: 'Order ID', width: 100 },
    { key: 'customer', label: 'Customer', width: 118 },
    { key: 'subtotal', label: 'Subtotal', width: 62, numeric: true },
    { key: 'tax', label: 'Tax', width: 52, numeric: true },
    { key: 'discount', label: 'Discount', width: 58, numeric: true },
    { key: 'shipping', label: 'Shipping', width: 58, numeric: true },
    { key: 'total', label: 'Total', width: 68, numeric: true },
    { key: 'payment', label: 'Payment', width: 66 },
    { key: 'status', label: 'Status', width: 80 }
];
const GUTTER = 6;
const TABLE_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);
const ROW_HEIGHT = 18;

// Plain "Rs" amounts — PDFKit's built-in Helvetica has no rupee glyph.
const money = (n) =>
    Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: '2-digit' });

export const streamLedgerPdf = async ({ cursor, periodLabel, filename }, res) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40, bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    doc.pipe(res);

    const left = doc.page.margins.left;
    const pageBottom = () => doc.page.height - doc.page.margins.bottom - 20;
    let y = 40;

    const drawColumnHeader = () => {
        doc.rect(left, y, TABLE_WIDTH, ROW_HEIGHT).fill('#EDEAE0');
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#18160F');
        let x = left;
        COLUMNS.forEach((c) => {
            doc.text(c.label, x, y + 5, {
                width: c.width - GUTTER,
                align: c.numeric ? 'right' : 'left',
                lineBreak: false
            });
            x += c.width;
        });
        y += ROW_HEIGHT;
    };

    const drawRow = (values, { bold = false, topRule = false } = {}) => {
        if (topRule) {
            doc.moveTo(left, y).lineTo(left + TABLE_WIDTH, y).lineWidth(0.8).strokeColor('#18160F').stroke();
        }
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor('#18160F');
        let x = left;
        COLUMNS.forEach((c) => {
            doc.text(String(values[c.key] ?? ''), x, y + 5, {
                width: c.width - GUTTER,
                align: c.numeric ? 'right' : 'left',
                lineBreak: false,
                ellipsis: true
            });
            x += c.width;
        });
        if (!bold) {
            doc.moveTo(left, y + ROW_HEIGHT - 1).lineTo(left + TABLE_WIDTH, y + ROW_HEIGHT - 1)
                .lineWidth(0.4).strokeColor('#DDDAD0').stroke();
        }
        y += ROW_HEIGHT;
    };

    const ensureSpace = (rowsNeeded = 1) => {
        if (y + ROW_HEIGHT * rowsNeeded > pageBottom()) {
            doc.addPage();
            y = 40;
            drawColumnHeader();
        }
    };

    // --- Title block ---
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#18160F').text('Presense \u2014 Sales Ledger', left, y);
    y += 26;
    doc.font('Helvetica').fontSize(9).fillColor('#5A5647');
    doc.text(`Period: ${periodLabel}`, left, y);
    y += 12;
    doc.text(
        `Generated: ${new Date().toLocaleString('en-GB', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' })} IST`,
        left,
        y
    );
    y += 12;
    doc.text('All amounts in Rs.', left, y);
    y += 22;

    drawColumnHeader();

    // --- Rows, streamed from the cursor ---
    const totals = { orders: 0, subtotal: 0, tax: 0, discount: 0, shipping: 0, total: 0 };

    try {
        for await (const order of cursor) {
            ensureSpace();
            const p = order.pricing || {};

            totals.orders += 1;
            totals.subtotal += p.subtotal || 0;
            totals.tax += p.tax || 0;
            totals.discount += p.discount || 0;
            totals.shipping += p.shippingFee || 0;
            totals.total += p.total || 0;

            drawRow({
                date: formatDate(order.createdAt),
                orderCode: order.orderCode,
                customer: order.shippingAddress?.fullName || '\u2014',
                subtotal: money(p.subtotal),
                tax: money(p.tax),
                discount: money(p.discount),
                shipping: money(p.shippingFee),
                total: money(p.total),
                payment: order.paymentMethod || 'COD', // .lean() skips schema defaults, so older orders have none
                status: String(order.status || '').replace(/_/g, ' ')
            });
        }
    } catch (err) {
        // Headers/bytes may already be on the wire, so abort the download
        // instead of handing the user a silently truncated ledger.
        doc.end();
        res.destroy(err);
        return;
    }

    if (totals.orders === 0) {
        doc.font('Helvetica').fontSize(10).fillColor('#5A5647')
            .text('No sales in this period.', left, y + 12, { lineBreak: false });
        y += 36;
    } else {
        ensureSpace(2);
        drawRow(
            {
                date: 'TOTAL',
                orderCode: `${totals.orders} order${totals.orders === 1 ? '' : 's'}`,
                subtotal: money(totals.subtotal),
                tax: money(totals.tax),
                discount: money(totals.discount),
                shipping: money(totals.shipping),
                total: money(totals.total)
            },
            { bold: true, topRule: true }
        );
    }

    doc.font('Helvetica').fontSize(7.5).fillColor('#888888').text(
        'Includes pending, confirmed, shipped and delivered orders (COD, or online/wallet orders once paid). ' +
        'Excludes cancelled and refunded orders and returns in progress. Items cancelled within an order are not deducted from that order\u2019s total.',
        left,
        Math.min(y + 14, pageBottom() + 8),
        { width: TABLE_WIDTH, lineBreak: true }
    );

    // --- Page numbers (needs bufferPages) ---
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
        doc.switchToPage(i);
        const bottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0; // otherwise writing this low would trigger an automatic new page
        doc.font('Helvetica').fontSize(8).fillColor('#888888').text(
            `Page ${i + 1} of ${range.count}`,
            left,
            doc.page.height - 28,
            { width: TABLE_WIDTH, align: 'right', lineBreak: false }
        );
        doc.page.margins.bottom = bottomMargin;
    }

    doc.end();
};