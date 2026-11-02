import { catchAsync } from '../../utils/catchAsync.js';
import * as referralService from '../../services/referralService.js';

export const showReferrals = catchAsync(async (req, res) => {
    const data = await referralService.getAdminOverview({ page: req.query.page, status: req.query.status || '' });
    res.render('admin/referrals', { ...data, title: 'Referrals', saved: req.query.saved === '1', error: req.query.error || null, adminName: req.session.admin.name });
});

export const saveSettings = catchAsync(async (req, res) => {
    try {
        await referralService.updateSettings(req.body);
        res.redirect('/admin/referrals?saved=1');
    } catch (err) {
        res.redirect('/admin/referrals?error=' + encodeURIComponent(err.message));
    }
});