import { catchAsync } from '../../utils/catchAsync.js';
import * as walletService from '../../services/user/walletService.js';
import * as checkoutService from '../../services/checkoutService.js';

export const showWallet = catchAsync(async (req, res) => {
    const data = await walletService.getWalletSummary(req.user._id, { page: req.query.page, limit: 10 });
    res.render('user/wallet', { ...data, title: 'My Wallet' });
});


export const getBalance = catchAsync(async (req, res) => {
    const balance = await walletService.getBalance(req.user._id);
    res.json({ success: true, balance });
});


export const checkoutWithWallet = catchAsync(async (req, res) => {
    const { addressId, couponCode, idempotencyKey } = req.body;
    const order = await checkoutService.placeOrder(req.user._id, addressId, couponCode, 'WALLET', idempotencyKey);
    res.json({ success: true, orderId: order._id });
});

export const createTopup = catchAsync(async (req, res) => {
    const data = await walletService.createTopupOrder(req.user._id, req.body.amount);
    res.json({ success: true, ...data });
});

export const verifyTopup = catchAsync(async (req, res) => {
    const data = await walletService.verifyTopup(req.user._id, req.body);
    res.json({ success: true, ...data });
});