import Order from '../models/Order.js';
import Product from '../models/Products.js';
import Category from '../models/Category.js';

const TZ = 'Asia/Kolkata';


export const SALE_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'return_rejected'];

const saleMatch = (from, to) => ({
    createdAt: { $gte: from, $lt: to },
    status: { $in: SALE_STATUSES },
    $or: [
        { paymentMethod: { $in: ['COD', null] } },
        { paymentStatus: 'paid' }
    ]
});


const ACTIVE_ITEM = { 'items.status': { $in: ['active', null] } };

const BUCKET_FORMAT = { day: '%Y-%m-%d', month: '%Y-%m', year: '%Y' };

export const findFirstOrderDate = async () => {
    return await Order.findOne({}).sort({ createdAt: 1 }).select('createdAt').lean();
};


export const salesByBucket = async (from, to, groupBy) => {
    return await Order.aggregate([
        { $match: saleMatch(from, to) },
        {
            $group: {
                _id: { $dateToString: { format: BUCKET_FORMAT[groupBy], date: '$createdAt', timezone: TZ } },
                revenue: { $sum: '$pricing.total' },
                orders: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

export const salesSummary = async (from, to) => {
    const match = saleMatch(from, to);

    const [orderTotals, unitTotals] = await Promise.all([
        Order.aggregate([
            { $match: match },
            { $group: { _id: null, revenue: { $sum: '$pricing.total' }, orders: { $sum: 1 } } }
        ]),
        Order.aggregate([
            { $match: match },
            { $unwind: '$items' },
            { $match: ACTIVE_ITEM },
            { $group: { _id: null, units: { $sum: '$items.quantity' } } }
        ])
    ]);

    return {
        revenue: orderTotals[0]?.revenue || 0,
        orders: orderTotals[0]?.orders || 0,
        units: unitTotals[0]?.units || 0
    };
};

// Ranked by units sold, revenue as the tie-breaker. The lookup runs AFTER
// $limit so only 10 product docs are fetched; it supplies the current
// name/image, falling back to the snapshot stored on the order item.
export const topProducts = async (from, to, limit = 10) => {
    return await Order.aggregate([
        { $match: saleMatch(from, to) },
        { $unwind: '$items' },
        { $match: ACTIVE_ITEM },
        {
            $group: {
                _id: '$items.productId',
                snapshotName: { $first: '$items.name' },
                snapshotBrand: { $first: '$items.brand' },
                snapshotImage: { $first: '$items.image' },
                unitsSold: { $sum: '$items.quantity' },
                revenue: { $sum: '$items.lineTotal' }
            }
        },
        { $sort: { unitsSold: -1, revenue: -1 } },
        { $limit: limit },
        { $lookup: { from: Product.collection.name, localField: '_id', foreignField: '_id', as: 'product' } },
        {
            $project: {
                unitsSold: 1,
                revenue: 1,
                name: { $ifNull: [{ $arrayElemAt: ['$product.name', 0] }, '$snapshotName'] },
                brand: { $ifNull: [{ $arrayElemAt: ['$product.brand', 0] }, '$snapshotBrand'] },
                image: {
                    $ifNull: [{ $arrayElemAt: [{ $arrayElemAt: ['$product.image', 0] }, 0] }, '$snapshotImage']
                }
            }
        }
    ]);
};


export const topCategories = async (from, to, limit = 10) => {
    return await Order.aggregate([
        { $match: saleMatch(from, to) },
        { $unwind: '$items' },
        { $match: ACTIVE_ITEM },
        {
            $group: {
                _id: '$items.productId',
                unitsSold: { $sum: '$items.quantity' },
                revenue: { $sum: '$items.lineTotal' }
            }
        },
        { $lookup: { from: Product.collection.name, localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        {
            $group: {
                _id: '$product.categoryId',
                unitsSold: { $sum: '$unitsSold' },
                revenue: { $sum: '$revenue' }
            }
        },
        { $sort: { unitsSold: -1, revenue: -1 } },
        { $limit: limit },
        { $lookup: { from: Category.collection.name, localField: '_id', foreignField: '_id', as: 'category' } },
        {
            $project: {
                unitsSold: 1,
                revenue: 1,
                name: { $ifNull: [{ $arrayElemAt: ['$category.name', 0] }, 'Uncategorised'] }
            }
        }
    ]);
};


export const topBrands = async (from, to, limit = 10) => {
    return await Order.aggregate([
        { $match: saleMatch(from, to) },
        { $unwind: '$items' },
        { $match: ACTIVE_ITEM },
        {
            $group: {
                _id: { $toLower: { $trim: { input: '$items.brand' } } },
                name: { $first: '$items.brand' },
                unitsSold: { $sum: '$items.quantity' },
                revenue: { $sum: '$items.lineTotal' }
            }
        },
        { $sort: { unitsSold: -1, revenue: -1 } },
        { $limit: limit },
        { $project: { _id: 0, name: 1, unitsSold: 1, revenue: 1 } }
    ]);
};


export const ledgerCursor = (from, to) => {
    return Order.find(saleMatch(from, to))
        .select('orderCode createdAt shippingAddress.fullName pricing paymentMethod status')
        .sort({ createdAt: 1 })
        .lean()
        .cursor();
};