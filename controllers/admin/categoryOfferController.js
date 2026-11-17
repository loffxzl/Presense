import { catchAsync } from '../../utils/catchAsync.js';
import * as categoryOfferService from '../../services/admin/categoryOfferService.js';

const BASE = '/admin/category-offers';


const backUrl = (req, params) => {
    const keep = new URLSearchParams();
    const src = { ...req.query, ...req.body };
    ['status', 'search', 'page'].forEach((k) => {
        const v = String(src[`_${k}`] ?? src[k] ?? '').trim();
        if (v) keep.set(k, v);
    });
    Object.entries(params).forEach(([k, v]) => keep.set(k, v));
    return `${BASE}?${keep.toString()}`;
};



const messageFor = (err) => {
    const status = err.statusCode ?? err.status;
    if (status && status < 500) return err.message;
    console.error('Category offer error:', err);
    return 'Something went wrong. Please try again.';
};

export const showOffers = catchAsync(async (req, res) => {
    const data = await categoryOfferService.listCategoryOffers({
        page: req.query.page,
        status: req.query.status || '',
        search: req.query.search || ''
    });

    res.render('admin/category-offers', {
        ...data,
        title: 'Category Offers',
        adminName: req.session.admin.name,
        saved: req.query.saved || null,
        error: req.query.error || null
    });
});

export const saveOffer = catchAsync(async (req, res) => {
    try {
        const { name, created } = await categoryOfferService.saveOffer(req.params.id, req.body);
        res.redirect(backUrl(req, { saved: `Offer ${created ? 'added to' : 'updated for'} ${name}.` }));
    } catch (err) {
        res.redirect(backUrl(req, { error: messageFor(err) }));
    }
});

export const toggleOffer = catchAsync(async (req, res) => {
    try {
        const { name, isActive } = await categoryOfferService.toggleOffer(req.params.id);
        res.redirect(backUrl(req, { saved: `Offer for ${name} ${isActive ? 'switched on' : 'paused'}.` }));
    } catch (err) {
        res.redirect(backUrl(req, { error: messageFor(err) }));
    }
});

export const removeOffer = catchAsync(async (req, res) => {
    try {
        const { name } = await categoryOfferService.removeOffer(req.params.id);
        res.redirect(backUrl(req, { saved: `Offer removed from ${name}.` }));
    } catch (err) {
        res.redirect(backUrl(req, { error: messageFor(err) }));
    }
});
