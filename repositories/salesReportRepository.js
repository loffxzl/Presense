// repositories/salesReportRepository.js
import Order from '../models/Order.js';

// What counts as a sale. One definition, used by every number in the report so
// the summary, the breakdown, the coupon table and the downloads always agree:
//   - the order falls inside the date range (by the time it was placed),
//   - it was not cancelled,
//   - and it is either cash on delivery or already paid. This leaves out
//     online orders that were started but never paid. Orders saved before
//     payment methods existed have no paymentMethod and count as COD.
export const buildSalesMatch = ({ start, end }) => ({
    createdAt: { $gte: start, $lt: end },
    status: { $ne: 'cancelled' },
    $or: [
        { paymentMethod: 'COD' },
        { paymentMethod: { $exists: false } },
        { paymentStatus: 'paid' }
    ]
});

const HAS_COUPON = { $ne: [{ $ifNull: ['$couponCode', ''] }, ''] };

export const getSummary = async (match) => {
    const [row] = await Order.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                orders: { $sum: 1 },
                subtotal: { $sum: '$pricing.subtotal' },
                tax: { $sum: '$pricing.tax' },
                shipping: { $sum: '$pricing.shippingFee' },
                discount: { $sum: '$pricing.discount' },
                total: { $sum: '$pricing.total' },
                refunded: { $sum: { $ifNull: ['$refundedAmount', 0] } },
                couponOrders: { $sum: { $cond: [HAS_COUPON, 1, 0] } },
                couponDiscount: { $sum: { $cond: [HAS_COUPON, '$pricing.discount', 0] } }
            }
        }
    ]);
    return row || null;
};

// Discount given per coupon code.
export const getCouponBreakdown = async (match) => {
    return await Order.aggregate([
        { $match: { ...match, couponCode: { $exists: true, $ne: '' } } },
        {
            $group: {
                _id: '$couponCode',
                orders: { $sum: 1 },
                discount: { $sum: '$pricing.discount' },
                orderAmount: { $sum: '$pricing.total' }
            }
        },
        { $sort: { discount: -1 } }
    ]);
};

// Totals per day or per month, grouped in Indian time so an order placed at
// 11:30 pm lands on the right day. `format` is '%Y-%m-%d' or '%Y-%m'.
export const getTrend = async (match, format) => {
    return await Order.aggregate([
        { $match: match },
        {
            $group: {
                _id: { $dateToString: { format, date: '$createdAt', timezone: 'Asia/Kolkata' } },
                orders: { $sum: 1 },
                discount: { $sum: '$pricing.discount' },
                total: { $sum: '$pricing.total' }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

const ORDER_FIELDS =
    'orderCode createdAt pricing couponCode paymentMethod paymentStatus status refundedAmount shippingAddress.fullName';

export const findOrders = async (match, { skip = 0, limit = 15 } = {}) => {
    return await Order.find(match).sort({ createdAt: -1 }).skip(skip).limit(limit).select(ORDER_FIELDS).lean();
};

export const countOrders = async (match) => {
    return await Order.countDocuments(match);
};

// For downloads: every order in range, no paging.
export const findAllOrders = async (match) => {
    return await Order.find(match).sort({ createdAt: -1 }).select(ORDER_FIELDS).lean();
};