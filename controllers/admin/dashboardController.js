import * as dashboardService from '../../services/admin/dashboardService.js';
import { streamLedgerPdf } from '../../services/admin/ledgerService.js';
import { catchAsync } from '../../utils/catchAsync.js';

export const getDashboard = catchAsync(async (req, res) => {
    const { filter, year, from, to } = req.query;
    const data = await dashboardService.getDashboardData({ filter, year, from, to });

    return res.render('admin/dashboard', {
        ...data,
        title: 'Dashboard',
        adminName: req.session.admin.name
    });
});

export const downloadLedger = catchAsync(async (req, res) => {
    const { filter, year, from, to } = req.query;
    const source = await dashboardService.getLedgerSource({ filter, year, from, to });
    await streamLedgerPdf(source, res);
});