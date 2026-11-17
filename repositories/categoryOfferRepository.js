import Category from '../models/Category.js';

const LIVE = { isDeleted: { $ne: true } };

export const findAllForOffers = async () =>
    Category.find(LIVE).select('name status imageUrl offer').sort({ name: 1 }).lean();

export const findCategoryForOffer = async (id) =>
    Category.findOne({ _id: id, ...LIVE }).select('name status offer').lean();

export const setOffer = async (id, offer) =>
    Category.findOneAndUpdate(
        { _id: id, ...LIVE },
        { $set: { offer } },
        { new: true, runValidators: true }
    ).lean();

export const setOfferActive = async (id, isActive) =>
    Category.findOneAndUpdate(
        { _id: id, ...LIVE },
        { $set: { 'offer.isActive': isActive } },
        { new: true }
    ).lean();

export const clearOffer = async (id) =>
    Category.findOneAndUpdate(
        { _id: id, ...LIVE },
        { $unset: { offer: 1 } },
        { new: true }
    ).lean();
