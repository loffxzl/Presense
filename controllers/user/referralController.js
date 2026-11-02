import { catchAsync } from '../../utils/catchAsync.js';
import * as referralService from '../../services/referralService.js';

export const showReferrals = catchAsync(async (req, res) => {
    const data = await referralService.getUserSummary(req.user);
    res.render('user/referrals', { ...data, title: 'Refer & Earn' });
});