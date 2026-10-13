import * as orderRepository from '../../repositories/orderRepository.js';
import * as inventoryRepository from '../../repositories/inventoryRepository.js';
import AppError from '../../utils/AppError.js';


const CANCELLABLE_STATUSES = ['pending', 'confirmed'];

export const listOrders = async (userId, { page = 1, limit = 10, search = '' } = {}) => {
    const filter = {};
    if (search.trim()) {
        const pattern = new RegExp(search.trim(), 'i');
        filter.$or = [{ orderCode: pattern }, { 'items.name': pattern }];
    }

    const currentPage = Math.max(1, parseInt(page));
    const skip = (currentPage - 1) * limit;
    const sort = { createdAt: -1 };

    const [orders, totalOrders] = await Promise.all([
        orderRepository.findOrdersByUser({ userId, filter, skip, limit, sort }),
        orderRepository.countOrdersByUser(userId, filter)
    ]);

    return { orders, currentPage, totalPages: Math.ceil(totalOrders / limit), totalOrders, search };
};

export const getOrderForUser = async (orderId, userId) => {
    const order = await orderRepository.findOrderByIdForUser(orderId, userId);
    if (!order) throw new AppError('Order not found', 404);
    return order;
};


export const getInvoiceOrder = async (orderId, userId) => {
    const order = await orderRepository.findOrderByIdForUser(orderId, userId);
    if (!order) throw new AppError('Order not found', 404);
    if (order.status === 'cancelled') {
        throw new AppError('No invoice is available for a cancelled order', 409);
    }
    return order;
};


const restockItem = async (item, note) => {
    const updated = await inventoryRepository.adjustVariantStock(item.productId, item.variantId, item.quantity);
    if (!updated) return;

    const variant = updated.varients.id(item.variantId);
    await inventoryRepository.createStockLog({
        productId: item.productId,
        variantId: item.variantId,
        size: item.size,
        type: 'return',
        quantityChange: item.quantity,
        previousStock: variant.stock - item.quantity,
        newStock: variant.stock,
        note,
        performedBy: null
    });
};

export const cancelOrder = async (userId, orderId, reason = '') => {
    const order = await orderRepository.findOrderByIdForUser(orderId, userId);
    if (!order) throw new AppError('Order not found', 404);
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
        throw new AppError('This order can no longer be cancelled', 409);
    }

    for (const item of order.items) {
        if (item.status === 'active') {
            await restockItem(item, `Order ${order.orderCode} cancelled`);
            item.status = 'cancelled';
            if (reason) item.cancelReason = reason;
            item.cancelledAt = new Date();
        }
    }

    order.status = 'cancelled';
    if (reason) order.cancelReason = reason;
    order.cancelledAt = new Date();

    await order.save();
    return order;
};

export const cancelOrderItem = async (userId, orderId, productId, variantId, reason = '') => {
    const order = await orderRepository.findOrderByIdForUser(orderId, userId);
    if (!order) throw new AppError('Order not found', 404);
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
        throw new AppError('This order can no longer be modified', 409);
    }

    const item = order.items.find(
        (i) => i.productId.toString() === String(productId) && i.variantId.toString() === String(variantId)
    );
    if (!item) throw new AppError('Item not found in this order', 404);
    if (item.status !== 'active') throw new AppError('This item has already been cancelled or returned', 409);

    await restockItem(item, `Item cancelled from order ${order.orderCode}`);
    item.status = 'cancelled';
    if (reason) item.cancelReason = reason;
    item.cancelledAt = new Date();


    if (order.items.every((i) => i.status === 'cancelled')) {
        order.status = 'cancelled';
        order.cancelledAt = new Date();
    }

    await order.save();
    return order;
};


export const requestReturn = async (userId, orderId, reason) => {
    if (!reason || !reason.trim()) throw new AppError('A reason is required to request a return', 400);

    const order = await orderRepository.findOrderByIdForUser(orderId, userId);
    if (!order) throw new AppError('Order not found', 404);
    if (order.status !== 'delivered') {
        throw new AppError('Only delivered orders can be returned', 409);
    }

    order.status = 'return_requested';
    order.returnReason = reason.trim();
    order.returnRequestedAt = new Date();

    await order.save();
    return order;
};


export const computeActiveSubtotal = (order) => {
    return order.items.filter((i) => i.status === 'active').reduce((sum, i) => sum + i.lineTotal, 0);
};