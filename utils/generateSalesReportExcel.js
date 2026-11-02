import ExcelJS from 'exceljs';

const MONEY_FORMAT = '#,##0.00';

const styleHeader = (row) => {
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF18160F' } };
    row.alignment = { vertical: 'middle' };
};

const formatDateTime = (date) =>
    new Date(date).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
    });

export const streamSalesReportExcel = async ({ range, summary, coupons, trend, orders }, res) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Presense';
    workbook.created = new Date();

    // --- Summary ---
    const sheet = workbook.addWorksheet('Summary');
    sheet.columns = [{ width: 34 }, { width: 20 }];

    sheet.addRow(['Presense — Sales Report']).font = { bold: true, size: 16 };
    sheet.addRow([`Period: ${range.label}`]);
    sheet.addRow([`Generated: ${formatDateTime(new Date())}`]);
    sheet.addRow([]);

    const header = sheet.addRow(['Metric', 'Value']);
    styleHeader(header);

    const money = (label, value) => {
        const row = sheet.addRow([label, value]);
        row.getCell(2).numFmt = MONEY_FORMAT;
        return row;
    };

    sheet.addRow(['Total sales (orders)', summary.orders]);
    money('Subtotal', summary.subtotal);
    money('Tax', summary.tax);
    money('Shipping', summary.shipping);
    money('Discount / coupon deductions', summary.discount);
    sheet.addRow(['Orders using a coupon', summary.couponOrders]);
    money('Order amount (total charged)', summary.total).font = { bold: true };
    money('Refunded to customers', summary.refunded);
    money('Net sales', summary.net).font = { bold: true };
    money('Average order value', summary.averageOrder);
    sheet.addRow([]);
    sheet.addRow(['Counts non-cancelled orders that are cash on delivery or paid. Net = order amount minus refunds.'])
        .font = { italic: true, color: { argb: 'FF5A5647' } };

    // --- Breakdown ---
    if (trend.length) {
        const t = workbook.addWorksheet('Breakdown');
        t.columns = [
            { header: 'Period', width: 16 },
            { header: 'Orders', width: 10 },
            { header: 'Discount', width: 14, style: { numFmt: MONEY_FORMAT } },
            { header: 'Order amount', width: 16, style: { numFmt: MONEY_FORMAT } }
        ];
        styleHeader(t.getRow(1));
        trend.forEach((r) => t.addRow([r.period, r.orders, r.discount, r.total]));
    }

    // --- Coupons ---
    const c = workbook.addWorksheet('Coupons');
    c.columns = [
        { header: 'Coupon code', width: 18 },
        { header: 'Orders', width: 10 },
        { header: 'Discount given', width: 16, style: { numFmt: MONEY_FORMAT } },
        { header: 'Order amount', width: 16, style: { numFmt: MONEY_FORMAT } }
    ];
    styleHeader(c.getRow(1));
    coupons.forEach((r) => c.addRow([r.code, r.orders, r.discount, r.orderAmount]));
    if (!coupons.length) c.addRow(['No coupons used in this period']);

    // --- Orders ---
    const o = workbook.addWorksheet('Orders');
    o.columns = [
        { header: 'Order ID', width: 18 },
        { header: 'Date', width: 22 },
        { header: 'Customer', width: 24 },
        { header: 'Payment', width: 12 },
        { header: 'Status', width: 18 },
        { header: 'Coupon', width: 14 },
        { header: 'Subtotal', width: 12, style: { numFmt: MONEY_FORMAT } },
        { header: 'Discount', width: 12, style: { numFmt: MONEY_FORMAT } },
        { header: 'Order amount', width: 14, style: { numFmt: MONEY_FORMAT } },
        { header: 'Refunded', width: 12, style: { numFmt: MONEY_FORMAT } }
    ];
    styleHeader(o.getRow(1));
    o.views = [{ state: 'frozen', ySplit: 1 }];

    orders.forEach((order) => {
        o.addRow([
            order.orderCode,
            formatDateTime(order.createdAt),
            (order.shippingAddress && order.shippingAddress.fullName) || '',
            order.paymentMethod || 'COD',
            String(order.status).replace(/_/g, ' '),
            order.couponCode || '',
            order.pricing.subtotal,
            order.pricing.discount,
            order.pricing.total,
            order.refundedAmount || 0
        ]);
    });

    await workbook.xlsx.write(res);
    res.end();
};