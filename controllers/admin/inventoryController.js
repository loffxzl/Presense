import { catchAsync } from '../../utils/catchAsync.js';
import * as inventoryService from '../../services/admin/inventoryService.js';

export const listInventory = catchAsync(async (req, res) => {
    const { page = 1, search = '', lowStockOnly = false } = req.query;
    const data = await inventoryService.listInventory({ page, limit: 10, search, lowStockOnly });
    res.render('admin/inventory', { ...data, title: 'Inventory Management' , adminName: req.session.admin.name});
});

export const adjustStock = catchAsync(async (req, res) => {
    const { productId, variantId } = req.params;
    const { delta, note } = req.body;
    const adminId = req.admin?._id || req.user?._id || null;

    const result = await inventoryService.adjustStock(productId, variantId, { delta, note, adminId });
    res.status(200).json({ success: true, ...result });
});

export const getStockLogs = catchAsync(async (req, res) => {
    const { productId, variantId } = req.params;
    const { page = 1 } = req.query;

    const data = await inventoryService.getStockLogs({ productId, variantId, page, limit: 20 });
    res.status(200).json({ success: true, ...data });
});