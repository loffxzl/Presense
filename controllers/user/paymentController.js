import * as paymentService from '../../services/user/paymentService.js';
import { catchAsync } from '../../utils/catchAsync.js';

export const startCheckout = catchAsync(async (req, res) => {
    const { addressId, couponCode, idempotencyKey } = req.body;
    const data = await paymentService.startOnlineCheckout(req.user._id, addressId, couponCode, idempotencyKey);
    res.json({ success: true, ...data });
});

export const createPaymentOrder = catchAsync(async (req, res) => {
    const data = await paymentService.createPaymentOrder(req.params.id, req.user._id);
    res.json({ success: true, ...data });
});

export const verifyPayment = catchAsync(async (req, res) => {
    const order = await paymentService.verifyPayment(req.params.id, req.user._id, req.body);
    res.json({ success: true, orderId: order._id, paymentStatus: order.paymentStatus });
});

export const abandonPayment = catchAsync(async (req, res) => {
    await paymentService.abandonPayment(req.params.id, req.user._id);
    res.json({ success: true });
});