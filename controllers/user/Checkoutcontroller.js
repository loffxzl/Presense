import { catchAsync } from '../../utils/catchAsync.js';
import * as checkoutService from '../../services/checkoutService.js';

export const getCheckoutPage = catchAsync(async (req, res) => {
    const data = await checkoutService.getCheckoutSummary(req.user._id);
    res.render('user/checkout', {
        ...data,
        title: 'Checkout'
    });
});

export const applyCoupon = catchAsync(async (req, res) => {
    const { code } = req.body;
    const data = await checkoutService.previewCoupon(req.user._id, code);
    res.status(200).json({ success: true, ...data });
});

export const placeOrder = catchAsync(async (req, res) => {
    const { addressId, couponCode } = req.body;
    const order = await checkoutService.placeOrder(req.user._id, addressId, couponCode);
    res.status(201).json({ success: true, orderId: order._id });
});