import { catchAsync } from '../../utils/catchAsync.js';
import * as homeService from '../../services/user/homeService.js';

// "/" -> landing for visitors, home for signed-in users (attachUser runs first).
export const showLanding = catchAsync(async (req, res) => {
    if (res.locals.user) return res.redirect('/home');
    const data = await homeService.getLandingData();
    res.render('user/landing', { ...data, title: 'Presense | Luxury & Middle Eastern Fragrances' });
});

export const showHome = catchAsync(async (req, res) => {
    const data = await homeService.getHomeData();
    res.render('user/home', { ...data, title: 'Home | Presense' });
});