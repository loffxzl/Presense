// repositories/paymentRepository.js
import Order from '../models/Order.js';

export const findOrderForUser = async (orderId, userId) => {
    return await Order.findOne({ _id: orderId, userId });
};

// Used by placeOrder's idempotency check. Scoped to the user, so a key can
// never be used to reach someone else's order.
export const findOrderByKey = async (userId, idempotencyKey) => {
    return await Order.findOne({ userId, idempotencyKey });
};

// Called when a Razorpay order is created for this order. Switching the
// method to 'razorpay' here (not at place-order time) means an order that
// never reaches the payment step stays a normal COD order.
export const attachRazorpayOrder = async (orderId, razorpayOrderId) => {
    return await Order.findByIdAndUpdate(
        orderId,
        { $set: { paymentMethod: 'RAZORPAY', paymentStatus: 'pending', razorpayOrderId } },
        { new: true }
    );
};

// The { paymentStatus: { $ne: 'paid' } } filter makes this idempotent: a
// double-click or a retried verify request can never overwrite an already
// recorded payment — it simply matches nothing and returns null.
export const markPaid = async (orderId, razorpayPaymentId) => {
    return await Order.findOneAndUpdate(
        { _id: orderId, paymentStatus: { $ne: 'paid' } },
        { $set: { paymentMethod: 'RAZORPAY', paymentStatus: 'paid', razorpayPaymentId, paidAt: new Date() } },
        { new: true }
    );
};

// Removes an order that never took effect: still unpaid, so it never touched
// stock, coupon usage or the cart. Paid orders are never deleted.
export const deleteUnpaidOrder = async (orderId, userId) => {
    return await Order.findOneAndDelete({
        _id: orderId,
        userId,
        paymentStatus: { $ne: 'paid' }
    });
};

// Wallet orders are paid the moment the wallet is debited; this just records it.
export const markPaidByWallet = async (orderId) => {
    return await Order.findByIdAndUpdate(
        orderId,
        { $set: { paymentMethod: 'WALLET', paymentStatus: 'paid', paidAt: new Date() } },
        { new: true }
    );
};

export const markFailed = async (orderId) => {
    return await Order.findOneAndUpdate(
        { _id: orderId, paymentStatus: 'pending' },
        { $set: { paymentStatus: 'failed' } },
        { new: true }
    );
};