import * as orderRepository from '../../repositories/orderRepository.js';
import * as inventoryRepository from '../../repositories/inventoryRepository.js';
import * as refundService from '../refundService.js';
import * as referralService from '../referralService.js';
import AppError from '../../utils/AppError.js';


export const ORDER_STATUS_FLOW = {
    pending: ['confirmed'],
    confirmed: ['shipped'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
    return_requested: ['return_approved', 'return_rejected'],
    return_approved: ['return_pickup'],
    return_rejected: [],
    return_pickup: ['return_in_transit'],
    return_in_transit: ['return_received'],
    return_received: ['refunded'],
    refunded: []
};

export const STATUS_LABELS = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    return_requested: 'Return Requested',
    return_approved: 'Return Approved',
    return_rejected: 'Return Rejected',
    return_pickup: 'Pickup Scheduled',
    return_in_transit: 'Return In Transit',
    return_received: 'Return Received',
    refunded: 'Refunded'
};

export const listOrders = async ({ page = 1, limit = 10, search = '', status = '' } = {}) => {
    const filter = {};

    if (search.trim()) {
        const pattern = new RegExp(search.trim(), 'i');
        filter.$or = [{ orderCode: pattern }, { 'shippingAddress.fullName': pattern }];
    }
    if (status.trim()) {
        filter.status = status.trim();
    }

    const currentPage = Math.max(1, parseInt(page));
    const skip = (currentPage - 1) * limit;
    const sort = { createdAt: -1 };

    const [orders, totalOrders] = await Promise.all([
        orderRepository.getOrderList({ filter, sort, skip, limit }),
        orderRepository.countOrders(filter)
    ]);

    return {
        orders,
        currentPage,
        totalPages: Math.ceil(totalOrders / limit) || 1,
        totalOrders,
        search,
        status,
        statusLabels: STATUS_LABELS
    };
};

export const getOrderDetails = async (orderId) => {
    const order = await orderRepository.findOrderById(orderId);
    if (!order) throw new AppError('Order not found', 404);

    return {
        order,
        nextStatuses: ORDER_STATUS_FLOW[order.status] || [],
        statusLabels: STATUS_LABELS
    };
};


const restockOrderItems = async (order, note) => {
    for (const item of order.items) {
        if (item.status !== 'active') continue; 

        const updated = await inventoryRepository.adjustVariantStock(item.productId, item.variantId, item.quantity);
        if (updated) {
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
        }

        item.status = 'returned';
    }
};

export const updateOrderStatus = async (orderId, nextStatus, { reason = '', adminId = null } = {}) => {
    const order = await orderRepository.findOrderById(orderId);
    if (!order) throw new AppError('Order not found', 404);

    const allowedNext = ORDER_STATUS_FLOW[order.status] || [];
    if (!allowedNext.includes(nextStatus)) {
        throw new AppError(`Cannot move order from "${order.status}" to "${nextStatus}"`, 409);
    }

    if (nextStatus === 'return_rejected' && !reason.trim()) {
        throw new AppError('A reason is required to reject a return', 400);
    }

    let autoNote = '';

    switch (nextStatus) {
        case 'delivered':
            order.deliveredAt = new Date();
            break;
        case 'return_approved':
            order.returnApprovedAt = new Date();
            break;
        case 'return_rejected':
            order.returnRejectedAt = new Date();
            order.rejectionReason = reason.trim();
            break;
        case 'return_pickup':
            order.returnPickedUpAt = new Date();
            break;
        case 'return_in_transit':
            order.returnInTransitAt = new Date();
            break;
        case 'return_received': {
            order.returnReceivedAt = new Date();

            const refunded = await refundService.refundOnReturn(order);
            if (refunded > 0) autoNote = `₹${refunded} refunded to customer's wallet`;
            await restockOrderItems(order, `Order ${order.orderCode} returned and restocked`);
            break;
        }
        case 'refunded':

            {
                const refunded = await refundService.refundOnReturn(order);
                if (refunded > 0) autoNote = `₹${refunded} refunded to customer's wallet`;
            }
            order.refundedAt = new Date();
            break;
        default:
            break;
    }

    order.status = nextStatus;
    order.statusHistory.push({
        status: nextStatus,
        changedBy: adminId || undefined,
        note: reason ? reason.trim() : (autoNote || undefined)
    });

    await order.save();


    if (nextStatus === 'delivered') {
        try {
            await referralService.rewardOnDelivery(order);
        } catch (err) {
            console.error('Referral reward failed:', err.message);
        }
    }

    return order;
};