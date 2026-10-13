import { catchAsync } from '../../utils/catchAsync.js';
import * as orderService from '../../services/admin/orderService.js';

export const listOrders = catchAsync(async (req, res) => {
    const { page = 1, search = '', status = '' } = req.query;
    const data = await orderService.listOrders({ page, limit: 10, search, status });
    res.render('admin/orders', { ...data, title: 'Order Management', adminName: req.session.admin.name});
});

export const getOrderDetails = catchAsync(async (req, res) => {
    const data = await orderService.getOrderDetails(req.params.id);
    res.render('admin/orderDetails', { ...data, title: `Order ${data.order.orderCode}`, adminName: req.session.admin.name });
});


export const updateStatus = catchAsync(async (req, res) => {
    const { status, reason } = req.body;
 
    const adminId = req.admin?._id || req.user?._id || null;

    const order = await orderService.updateOrderStatus(req.params.id, status, { reason, adminId });
    res.status(200).json({ success: true, order });
});