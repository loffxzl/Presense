import PDFDocument from 'pdfkit';

// pdfkit's built-in fonts can't render the ₹ glyph, so amounts use "Rs." (same as the invoice).
const money = (n) =>
    `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

const INK = '#18160F';
const SOFT = '#5A5647';
const LINE = '#C7C0AC';
const LEFT = 50;
const RIGHT = 545;
const BOTTOM = 770;

export const streamSalesReportPdf = ({ range, summary, coupons, trend, orders }, res) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    let y = 50;

    // Shortens text with "..." until it fits the column, so a long customer
    // name can't wrap onto the next row (pdfkit's own ellipsis doesn't do this).
    const fit = (text, width) => {
        if (doc.widthOfString(text) <= width) return text;
        let t = text;
        while (t.length > 1 && doc.widthOfString(`${t}...`) > width) t = t.slice(0, -1);
        return `${t.trimEnd()}...`;
    };

    // Starts a new page when the next block would run into the footer.
    const ensureSpace = (needed, redrawHeader) => {
        if (y + needed <= BOTTOM) return;
        doc.addPage();
        y = 50;
        if (redrawHeader) redrawHeader();
    };

    const sectionTitle = (text) => {
        ensureSpace(60);
        doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(text, LEFT, y);
        y += 20;
    };

    // Generic table. columns: [{ label, x, width, align }], rows: arrays of strings.
    const table = (columns, rows, { emptyText = '' } = {}) => {
        const drawHeader = () => {
            doc.font('Helvetica-Bold').fontSize(8).fillColor(SOFT);
            columns.forEach((c) => doc.text(c.label.toUpperCase(), c.x, y, { width: c.width, align: c.align || 'left', lineBreak: false }));
            doc.moveTo(LEFT, y + 13).lineTo(RIGHT, y + 13).strokeColor(LINE).stroke();
            y += 20;
        };

        ensureSpace(40);
        drawHeader();

        if (!rows.length) {
            doc.font('Helvetica-Oblique').fontSize(9).fillColor(SOFT).text(emptyText, LEFT, y);
            y += 20;
            return;
        }

        doc.font('Helvetica').fontSize(8.5).fillColor(INK);
        rows.forEach((row) => {
            ensureSpace(18, () => {
                drawHeader();
                doc.font('Helvetica').fontSize(8.5).fillColor(INK);
            });
            columns.forEach((c, i) => {
                doc.text(fit(String(row[i] ?? ''), c.width), c.x, y, { width: c.width, align: c.align || 'left', lineBreak: false });
            });
            y += 16;
        });
        y += 10;
    };

    // --- Header ---
    doc.font('Helvetica-Bold').fontSize(22).fillColor(INK).text('PRESENSE', LEFT, y);
    doc.font('Helvetica').fontSize(10).fillColor(SOFT).text('SALES REPORT', 400, y + 6, { width: 145, align: 'right' });
    y += 36;
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor(INK).stroke();
    y += 12;
    doc.font('Helvetica').fontSize(10).fillColor(INK).text(`Period: ${range.label}`, LEFT, y);
    doc.fillColor(SOFT).text(`Generated: ${formatDate(new Date())}`, 350, y, { width: 195, align: 'right' });
    y += 28;

    // --- Summary ---
    sectionTitle('Summary');
    const summaryRows = [
        ['Total sales (orders)', String(summary.orders)],
        ['Subtotal', money(summary.subtotal)],
        ['Tax', money(summary.tax)],
        ['Shipping', money(summary.shipping)],
        ['Discount / coupon deductions', money(summary.discount)],
        ['Orders using a coupon', String(summary.couponOrders)],
        ['Order amount (total charged)', money(summary.total)],
        ['Refunded to customers', money(summary.refunded)],
        ['Net sales', money(summary.net)],
        ['Average order value', money(summary.averageOrder)]
    ];
    summaryRows.forEach(([label, value], i) => {
        const strong = label === 'Order amount (total charged)' || label === 'Net sales';
        doc.font(strong ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5).fillColor(INK);
        doc.text(label, LEFT, y, { width: 260, lineBreak: false });
        doc.text(value, 320, y, { width: 225, align: 'right', lineBreak: false });
        y += 17;
        if (i === 5 || i === 7) {
            doc.moveTo(LEFT, y - 2).lineTo(RIGHT, y - 2).strokeColor(LINE).stroke();
            y += 4;
        }
    });
    y += 14;

    // --- Breakdown ---
    if (trend.length) {
        sectionTitle('Breakdown');
        table(
            [
                { label: 'Period', x: LEFT, width: 120 },
                { label: 'Orders', x: 180, width: 60, align: 'right' },
                { label: 'Discount', x: 280, width: 100, align: 'right' },
                { label: 'Order amount', x: 410, width: 135, align: 'right' }
            ],
            trend.map((t) => [t.period, t.orders, money(t.discount), money(t.total)])
        );
    }

    // --- Coupons ---
    sectionTitle('Coupon deductions');
    table(
        [
            { label: 'Coupon code', x: LEFT, width: 140 },
            { label: 'Orders', x: 200, width: 60, align: 'right' },
            { label: 'Discount given', x: 280, width: 110, align: 'right' },
            { label: 'Order amount', x: 410, width: 135, align: 'right' }
        ],
        coupons.map((c) => [c.code, c.orders, money(c.discount), money(c.orderAmount)]),
        { emptyText: 'No coupons were used in this period.' }
    );

    // --- Orders ---
    sectionTitle(`Orders (${orders.length})`);
    table(
        [
            { label: 'Order ID', x: LEFT, width: 88 },
            { label: 'Date', x: 140, width: 58 },
            { label: 'Customer', x: 202, width: 90 },
            { label: 'Coupon', x: 296, width: 58 },
            { label: 'Discount', x: 356, width: 58, align: 'right' },
            { label: 'Amount', x: 418, width: 66, align: 'right' },
            { label: 'Refund', x: 488, width: 57, align: 'right' }
        ],
        orders.map((o) => [
            o.orderCode,
            formatDate(o.createdAt),
            (o.shippingAddress && o.shippingAddress.fullName) || '',
            o.couponCode || '-',
            Number(o.pricing.discount).toLocaleString('en-IN'),
            Number(o.pricing.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            o.refundedAmount ? Number(o.refundedAmount).toLocaleString('en-IN') : '-'
        ]),
        { emptyText: 'No orders in this period.' }
    );

    // --- Footer note ---
    ensureSpace(30);
    doc.font('Helvetica-Oblique').fontSize(8).fillColor(SOFT).text(
        'Counts non-cancelled orders that are cash on delivery or paid. Net sales = order amount minus refunds. Order table amounts are in Rs.',
        LEFT, y, { width: 495 }
    );

    doc.end();
};