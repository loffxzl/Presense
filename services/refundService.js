import * as walletService from './user/walletService.js';

const round2 = (n) => Math.round(n * 100) / 100;


const itemRefund = (order, item) => {
    const { subtotal, tax, discount } = order.pricing;
    if (!subtotal) return item.lineTotal;
    return round2((item.lineTotal * (subtotal + tax - discount)) / subtotal);
};


const amountFor = (order, items) => {
    let amount = items.reduce((sum, item) => sum + itemRefund(order, item), 0);
    if (items.length === order.items.length) amount += order.pricing.shippingFee || 0;
    return round2(amount);
};


const wasPaidUpfront = (order) => order.paymentStatus === 'paid';


export const refundOnCancel = async (order, removedItems) => {
    if (!wasPaidUpfront(order) || removedItems.length === 0) return 0;

    const amount = amountFor(order, removedItems);
    if (amount <= 0) return 0;

    const refKey = removedItems.length === 1
        ? `refund:cancel:${order._id}:${removedItems[0].productId}:${removedItems[0].variantId}`
        : `refund:cancel:${order._id}`;

    const { credited } = await walletService.creditWallet({
        userId: order.userId,
        amount,
        reason: 'refund_cancel',
        orderId: order._id,
        refKey,
        description: `Refund for cancelled order ${order.orderCode}`
    });

    if (!credited) return 0;
    order.refundedAmount = round2((order.refundedAmount || 0) + amount);
    return amount;
};


export const refundOnReturn = async (order) => {
    const returned = order.items.filter((i) => i.status !== 'cancelled');
    if (returned.length === 0) return 0;

    const amount = amountFor(order, returned);
    if (amount <= 0) return 0;

    const { credited } = await walletService.creditWallet({
        userId: order.userId,
        amount,
        reason: 'refund_return',
        orderId: order._id,
        refKey: `refund:return:${order._id}`,
        description: `Refund for returned order ${order.orderCode}`
    });

    if (!credited) return 0;
    order.refundedAmount = round2((order.refundedAmount || 0) + amount);
    return amount;
};