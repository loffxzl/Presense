// services/user/paymentService.js
import AppError from '../../utils/AppError.js';
import { getRazorpayClient, isValidSignature } from '../../utils/razorpayClient.js';
import * as paymentRepository from '../../repositories/paymentRepository.js';
import * as checkoutService from '../checkoutService.js';

const assertPayable = (order) => {
    if (!order) throw new AppError('Order not found', 404);
    if (order.status === 'cancelled') throw new AppError('This order has been cancelled', 409);
    if (order.paymentStatus === 'paid') throw new AppError('This order is already paid', 409);
};

export const createPaymentOrder = async (orderId, userId) => {
    const order = await paymentRepository.findOrderForUser(orderId, userId);
    assertPayable(order);

    // The amount ALWAYS comes from the saved order, never from the browser.
    // Razorpay works in paise (1 INR = 100 paise).
    const amount = Math.round(order.pricing.total * 100);
    if (amount < 100) throw new AppError('Order total is too low for online payment', 400);

    let razorpayOrderId = order.razorpayOrderId;

    // Reuse the Razorpay order on retry — the amount can't have changed since
    // the order is already placed — so retries don't pile up orphan orders.
    if (!razorpayOrderId) {
        const rzpOrder = await getRazorpayClient().orders.create({
            amount,
            currency: 'INR',
            receipt: order.orderCode,
            notes: { orderId: String(order._id) }
        });
        razorpayOrderId = rzpOrder.id;
        await paymentRepository.attachRazorpayOrder(order._id, razorpayOrderId);
    }

    return {
        keyId: process.env.RAZORPAY_KEY_ID, // public key — safe to send to the browser
        razorpayOrderId,
        amount,
        currency: 'INR',
        orderCode: order.orderCode
    };
};

// One call for the "Pay online" button: saves a PENDING order (cart and stock
// untouched) and prepares the Razorpay payment for it.
export const startOnlineCheckout = async (userId, addressId, couponCode, idempotencyKey) => {
    const order = await checkoutService.placeOrder(userId, addressId, couponCode, 'RAZORPAY', idempotencyKey);

    try {
        const payment = await createPaymentOrder(order._id, userId);
        return { orderId: order._id, ...payment };
    } catch (err) {
        await paymentRepository.deleteUnpaidOrder(order._id, userId);
        throw err;
    }
};

export const verifyPayment = async (orderId, userId, payload) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new AppError('Missing payment details', 400);
    }

    const order = await paymentRepository.findOrderForUser(orderId, userId);
    if (!order) throw new AppError('Order not found', 404);

    // Already recorded (e.g. verify called twice) — treat as success.
    if (order.paymentStatus === 'paid') return order;

    if (!order.razorpayOrderId || order.razorpayOrderId !== razorpay_order_id) {
        throw new AppError('Payment does not match this order', 400);
    }

    // Only someone holding the key secret can produce a matching signature,
    // which is what stops a user from faking a "payment successful" request.
    if (!isValidSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
        await paymentRepository.markFailed(order._id);
        throw new AppError('Payment verification failed', 400);
    }

    // Money is real from here, so record it first. markPaid only returns the
    // order the FIRST time, which makes the finalize step below run once.
    const paidOrder = await paymentRepository.markPaid(order._id, razorpay_payment_id);
    if (!paidOrder) return await paymentRepository.findOrderForUser(orderId, userId);

    try {
        await checkoutService.finalizeOrder(paidOrder);
    } catch (err) {
        throw new AppError(
            'Your payment was received but an item just went out of stock. Please contact support — the order will be refunded.',
            409
        );
    }

    return paidOrder;
};

// User closed the payment window without paying: the pending order never
// affected the cart or stock, so it is simply removed.
export const abandonPayment = async (orderId, userId) => {
    await paymentRepository.deleteUnpaidOrder(orderId, userId);
};