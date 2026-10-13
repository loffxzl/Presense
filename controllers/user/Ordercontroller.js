import {catchAsync} from '../../utils/catchAsync.js';
import * as orderService from '../../services/user/orderService.js';
import { streamInvoicePdf } from '../../utils/generateInvoicePdf.js';

export const listOrders = catchAsync(async (req, res) => {
const { page = 1, search = '' } = req.query;
const data = await orderService.listOrders(req.user._id, { page, limit: 10, search });
res.render('user/orders', { ...data, title: 'Your Orders' });
});

export const getOrderSuccess = catchAsync(async (req, res) => {
const order = await orderService.getOrderForUser(req.params.id, req.user._id);
res.render('user/orderSuccess', { order, title: 'Order Placed' });
});

export const getOrderDetails = catchAsync(async (req, res) => {
const order = await orderService.getOrderForUser(req.params.id, req.user._id);
const activeSubtotal = orderService.computeActiveSubtotal(order);
res.render('user/orderDetails', { order, activeSubtotal, title: `Order ${order.orderCode}` });
});

export const downloadInvoice = catchAsync(async (req, res) => {
const order = await orderService.getInvoiceOrder(req.params.id, req.user._id);
res.setHeader('Content-Type', 'application/pdf');
res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderCode}.pdf"`);
streamInvoicePdf(order, res);
});

export const cancelOrder = catchAsync(async (req, res) => {
const { reason } = req.body;
const order = await orderService.cancelOrder(req.user._id, req.params.id, reason);
res.status(200).json({ success: true, order });
});

export const cancelOrderItem = catchAsync(async (req, res) => {
const { productId, variantId } = req.params;
const { reason } = req.body;
const order = await orderService.cancelOrderItem(req.user._id, req.params.id, productId, variantId, reason);
res.status(200).json({ success: true, order });
});

export const requestReturn = catchAsync(async (req, res) => {
const { reason } = req.body;
const order = await orderService.requestReturn(req.user._id, req.params.id, reason);
res.status(200).json({ success: true, order });
});