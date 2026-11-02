import { catchAsync } from '../../utils/catchAsync.js';
import * as walletService from '../../services/admin/walletService.js';

export const listWallets = catchAsync(async (req, res) => {
    const { page = 1, search = '' } = req.query;
    const data = await walletService.listWallets({ page, limit: 10, search });
    res.render('admin/wallets', { ...data, title: 'Wallets', adminName: req.session.admin.name });
});

export const getUserTransactions = catchAsync(async (req, res) => {
    const data = await walletService.getUserTransactions({
        userId: req.params.userId,
        page: req.query.page,
        limit: 20
    });
    res.status(200).json({ success: true, ...data });
});