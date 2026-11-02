// repositories/homeRepository.js
import Product from '../models/Products.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';

const LISTED = { isDeleted: { $ne: true }, status: 'active' };
const CATEGORY_FIELDS = 'name slug imageUrl description status isDeleted offer';

// Categories a customer may see.
export const findActiveCategories = () =>
    Category.find({ status: 'active', isDeleted: { $ne: true } })
        .select(CATEGORY_FIELDS)
        .sort({ createdAt: 1 })
        .lean();

// How many listed products each category has: { [categoryId]: count }
export const countProductsByCategory = async () => {
    const rows = await Product.aggregate([
        { $match: LISTED },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } }
    ]);
    return Object.fromEntries(rows.map((r) => [String(r._id), r.count]));
};

const populateCard = (query) =>
    query
        .populate('brandId', 'name')
        .populate('categoryId', CATEGORY_FIELDS)
        .lean();

export const findNewArrivals = (limit) =>
    populateCard(Product.find(LISTED).sort({ createdAt: -1 }).limit(limit));

// Products ordered most (units), counting only items still active in
// confirmed / shipped / delivered orders. Returns product ids, best first.
export const findBestSellerIds = async (limit) => {
    const rows = await Order.aggregate([
        { $match: { status: { $in: ['confirmed', 'shipped', 'delivered'] } } },
        { $unwind: '$items' },
        { $match: { 'items.status': 'active' } },
        { $group: { _id: '$items.productId', sold: { $sum: '$items.quantity' } } },
        { $sort: { sold: -1 } },
        { $limit: limit }
    ]);
    return rows.map((r) => r._id);
};

export const findProductsByIds = (ids) =>
    populateCard(Product.find({ _id: { $in: ids }, ...LISTED }));

// Products that carry an offer which has not expired (checked again in the
// service, this just keeps the query small).
export const findProductsWithOffers = (limit, now = new Date()) =>
    populateCard(
        Product.find({
            ...LISTED,
            offer: { $elemMatch: { isActive: true, expiryDate: { $gt: now } } }
        }).sort({ updatedAt: -1 }).limit(limit)
    );

export const findCategoriesWithOffers = (now = new Date()) =>
    Category.find({
        status: 'active',
        isDeleted: { $ne: true },
        'offer.isActive': true,
        'offer.expiryDate': { $gt: now }
    }).select(CATEGORY_FIELDS).lean();