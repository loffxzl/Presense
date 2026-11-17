import mongoose from 'mongoose';
import * as categoryOfferRepository from '../../repositories/categoryOfferRepository.js';
import AppError from '../../utils/AppError.js';

const MAX_OFFER_PERCENT = 90;
const PAGE_SIZE = 10;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const STATES = ['active', 'paused', 'expired', 'none'];



// 'active'  : switched on and not expired
// 'paused'  : switched off, not expired
// 'expired' : end date passed
// 'none'    : no offer set
const offerState = (offer, now = new Date()) => {
    if (!offer || !offer.discountPercent) return 'none';
    if (!offer.expiryDate || new Date(offer.expiryDate) <= now) return 'expired';
    return offer.isActive ? 'active' : 'paused';
};


const istDateString = (date) => new Date(new Date(date).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

const assertValidId = (id) => {
    if (!mongoose.isValidObjectId(id)) throw new AppError('Category not found', 404);
};

const parseOffer = (data) => {
    const percent = Number(String(data.offerPercent ?? '').trim());
    if (!Number.isFinite(percent) || percent < 1 || percent > MAX_OFFER_PERCENT) {
        throw new AppError(`Offer must be between 1% and ${MAX_OFFER_PERCENT}%`, 400);
    }

    const rawExpiry = String(data.offerExpiry ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawExpiry)) throw new AppError('Please choose when the offer ends', 400);

    // the offer runs until the end of that day, Indian time
    const expiryDate = new Date(`${rawExpiry}T23:59:59+05:30`);
    if (Number.isNaN(expiryDate.getTime())) throw new AppError('Offer end date is invalid', 400);

    const isActive = data.offerActive === 'on' || data.offerActive === 'true' || data.offerActive === true;
    if (isActive && expiryDate <= new Date()) throw new AppError('Offer end date must be in the future', 400);

    const label = String(data.offerLabel ?? '').trim().slice(0, 40) || `${percent}% off`;

    return { label, discountPercent: percent, expiryDate, isActive };
};



export const listCategoryOffers = async ({ page = 1, status = '', search = '' } = {}) => {
    const categories = await categoryOfferRepository.findAllForOffers();
    const now = new Date();

    const rows = categories.map((c) => {
        const state = offerState(c.offer, now);
        return {
            _id: c._id,
            name: c.name,
            imageUrl: c.imageUrl || null,
            categoryHidden: c.status === 'inactive',
            state,
            percent: c.offer?.discountPercent || null,
            label: c.offer?.label || '',
            isActive: Boolean(c.offer?.isActive),
            expiryDate: c.offer?.expiryDate || null,
            expiryInput: c.offer?.expiryDate ? istDateString(c.offer.expiryDate) : ''
        };
    });

    const counts = { all: rows.length, active: 0, paused: 0, expired: 0, none: 0 };
    rows.forEach((r) => { counts[r.state] += 1; });

    const term = String(search || '').trim().toLowerCase();
    const wanted = STATES.includes(status) ? status : '';
    const filtered = rows.filter((r) =>
        (!wanted || r.state === wanted) && (!term || r.name.toLowerCase().includes(term))
    );

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(Math.max(parseInt(page, 10) || 1, 1), totalPages);
    const items = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return {
        items,
        counts,
        status: wanted,
        search: String(search || '').trim(),
        currentPage,
        totalPages,
        todayIST: istDateString(now),
        maxPercent: MAX_OFFER_PERCENT
    };
};



export const saveOffer = async (categoryId, data) => {
    assertValidId(categoryId);
    const category = await categoryOfferRepository.findCategoryForOffer(categoryId);
    if (!category) throw new AppError('Category not found', 404);

    const offer = parseOffer(data);
    await categoryOfferRepository.setOffer(categoryId, offer);
    return { name: category.name, created: !category.offer };
};

export const toggleOffer = async (categoryId) => {
    assertValidId(categoryId);
    const category = await categoryOfferRepository.findCategoryForOffer(categoryId);
    if (!category || !category.offer || !category.offer.discountPercent) {
        throw new AppError('This category has no offer', 404);
    }

    const turningOn = !category.offer.isActive;
    if (turningOn && (!category.offer.expiryDate || new Date(category.offer.expiryDate) <= new Date())) {
        throw new AppError('This offer has expired. Edit it and choose a new end date.', 400);
    }

    await categoryOfferRepository.setOfferActive(categoryId, turningOn);
    return { name: category.name, isActive: turningOn };
};

export const removeOffer = async (categoryId) => {
    assertValidId(categoryId);
    const category = await categoryOfferRepository.findCategoryForOffer(categoryId);
    if (!category) throw new AppError('Category not found', 404);
    if (!category.offer || !category.offer.discountPercent) throw new AppError('This category has no offer', 404);

    await categoryOfferRepository.clearOffer(categoryId);
    return { name: category.name };
};