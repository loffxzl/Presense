import { catchAsync } from '../../utils/catchAsync.js';
import * as salesReportService from '../../services/admin/salesReportService.js';
import { streamSalesReportPdf } from '../../utils/generateSalesReportPdf.js';
import { streamSalesReportExcel } from '../../utils/generateSalesReportExcel.js';

export const showSalesReport = catchAsync(async (req, res) => {
    const data = await salesReportService.getReportPage(req.query);
    res.render('admin/salesReport', { ...data, title: 'Sales Report', adminName: req.session.admin.name });
});

export const downloadPdf = catchAsync(async (req, res) => {
    const report = await salesReportService.getReportForDownload(req.query);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="sales-report-${report.range.fileSlug}.pdf"`);
    streamSalesReportPdf(report, res);
});

export const downloadExcel = catchAsync(async (req, res) => {
    const report = await salesReportService.getReportForDownload(req.query);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="sales-report-${report.range.fileSlug}.xlsx"`);
    await streamSalesReportExcel(report, res);
});