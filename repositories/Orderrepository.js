import Order from '../models/Order.js';

export const createOrder = async (data) => {
    return await Order.create(data);
};

export const findOrderByIdForUser = async (orderId, userId) => {
    return await Order.findOne({ _id: orderId, userId });
};

export const findOrdersByUser = async ({ userId, filter = {}, skip, limit, sort }) => {
    return await Order.find({ userId, ...filter }).sort(sort).skip(skip).limit(limit);
};

export const countOrdersByUser = async (userId, filter = {}) => {
    return await Order.countDocuments({ userId, ...filter });
};

export const countUserOrdersWithCoupon = async (userId, code) => {
    return await Order.countDocuments({ userId, couponCode: code, status: { $ne: 'cancelled' } });
};



// admin side order - management

export const getOrderList = async ({ filter = {}, sort = { createdAt: -1 }, skip = 0, limit = 10 } = {}) => {
    return await Order.find(filter)
        .populate('userId', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit);
};

export const countOrders = async (filter = {}) => {
    return await Order.countDocuments(filter);
};

export const findOrderById = async (orderId) => {
    return await Order.findById(orderId).populate('userId', 'name email');
};

export const updateStatus = async (orderId, data) => {
    return await Order.findByIdAndUpdate(orderId, data, { new: true });
};

export const findOrderByany = async (data) => {
    return await Order.findOne(data);
};