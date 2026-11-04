import { customAlphabet } from 'nanoid';
import * as cartService from './user/cartService.js';
import * as addressService from './user/addressService.js';
import * as orderRepository from '../repositories/Orderrepository.js';
import * as inventoryRepository from '../repositories/Inventoryrepository.js';
import * as couponRepository from '../repositories/CouponRepository.js';
import * as paymentRepository from '../repositories/paymentRepository.js';
import * as walletService from './user/walletService.js';
import AppError from '../utils/AppError.js';

const TAX_RATE = 0.05;            
const FREE_SHIPPING_THRESHOLD = 999;
const FLAT_SHIPPING_FEE = 49;

const round2 = (n) => Math.round(n * 100) / 100;

const computePricing = (subtotal, discount = 0) => {
    const tax = Math.round(subtotal * TAX_RATE);
    const shippingFee = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
    // offers can make prices decimal, so keep totals at exactly 2 decimals
    const total = round2(Math.max(subtotal + tax - discount + shippingFee, 0));
    return { subtotal, tax, discount, shippingFee, total };
};


const calcDiscount = (coupon, subtotal) => {
    if (coupon.discountType === 'percentage') {
        let discountAmount = Math.round(subtotal * (coupon.discountValue / 100));
        if (coupon.maxDiscountAmount) discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
        return discountAmount;
    }
    return Math.min(coupon.discountValue, subtotal); 
};


const validateCoupon = async (userId, code, subtotal) => {
    if (!code || !code.trim()) throw new AppError('Please enter a coupon code', 400);
    const normalizedCode = code.trim().toUpperCase();

    const coupon = await couponRepository.findCouponByCode(normalizedCode);
    if (!coupon) throw new AppError('Invalid coupon code', 404);
    if (!coupon.isActive) throw new AppError('This coupon is not active', 400);
    if (new Date(coupon.expiryDate) < new Date()) throw new AppError('This coupon has expired', 400);
    if (subtotal < coupon.minOrderAmount) {
        throw new AppError(`This coupon requires a minimum order of ₹${coupon.minOrderAmount}`, 400);
    }
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
        throw new AppError('This coupon has reached its usage limit', 409);
    }

    const userUsageCount = await orderRepository.countUserOrdersWithCoupon(userId, normalizedCode);
    if (coupon.usageLimitPerUser > 0 && userUsageCount >= coupon.usageLimitPerUser) {
        throw new AppError('You have already used this coupon the maximum number of times', 409);
    }

    return { coupon, discountAmount: calcDiscount(coupon, subtotal) };
};


export const getAvailableCoupons = async (userId, subtotal) => {
    if (subtotal <= 0) return [];

    const candidates = await couponRepository.findEligibleCoupons(subtotal);

    const eligible = [];
    for (const coupon of candidates) {
        if (coupon.usageLimitPerUser > 0) {
            const userUsageCount = await orderRepository.countUserOrdersWithCoupon(userId, coupon.code);
            if (userUsageCount >= coupon.usageLimitPerUser) continue;
        }
        eligible.push({
            code: coupon.code,
            description: coupon.description || '',
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            minOrderAmount: coupon.minOrderAmount,
            youSave: calcDiscount(coupon, subtotal)
        });
    }

    return eligible;
};

export const getCheckoutSummary = async (userId) => {
    const cart = await cartService.getCartDetails(userId);
    const addresses = await addressService.getAddresses(userId);
    const pricing = computePricing(cart.subtotal);
    const availableCoupons = await getAvailableCoupons(userId, cart.subtotal);

    return { items: cart.items, addresses, pricing, availableCoupons };
};


export const previewCoupon = async (userId, code) => {
    const cart = await cartService.getCartDetails(userId);
    if (cart.items.length === 0) throw new AppError('Your bag is empty', 400);

    const { coupon, discountAmount } = await validateCoupon(userId, code, cart.subtotal);
    const pricing = computePricing(cart.subtotal, discountAmount);

    return { pricing, code: coupon.code };
};



export const finalizeOrder = async (order) => {
    const deducted = [];

    try {
        for (const item of order.items) {
            const updated = await inventoryRepository.adjustVariantStock(item.productId, item.variantId, -item.quantity);
            if (!updated) throw new AppError(`"${item.name}" went out of stock — please update your bag`, 409);
            deducted.push(item);

            const variant = updated.varients.id(item.variantId);
            await inventoryRepository.createStockLog({
                productId: item.productId,
                variantId: item.variantId,
                size: item.size,
                type: 'sale',
                quantityChange: -item.quantity,
                previousStock: variant.stock + item.quantity,
                newStock: variant.stock,
                note: `Order ${order.orderCode} placed (${order.paymentMethod})`,
                performedBy: null
            });
        }
    } catch (err) {
        for (const item of deducted) {
            const restored = await inventoryRepository.adjustVariantStock(item.productId, item.variantId, item.quantity);
            if (restored) {
                const variant = restored.varients.id(item.variantId);
                await inventoryRepository.createStockLog({
                    productId: item.productId,
                    variantId: item.variantId,
                    size: item.size,
                    type: 'adjustment',
                    quantityChange: item.quantity,
                    previousStock: variant.stock - item.quantity,
                    newStock: variant.stock,
                    note: `Order ${order.orderCode} failed — stock restored`,
                    performedBy: null
                });
            }
        }
        throw err;
    }

    if (order.couponCode) {
        await couponRepository.incrementUsage(order.couponCode);
    }

    await cartService.clearCart(order.userId);
};

// Idempotency keys come from the browser, so treat them as untrusted input:
// only a short non-empty string is accepted, anything else is ignored.
const cleanIdempotencyKey = (key) => {
    if (typeof key !== 'string') return null;
    const trimmed = key.trim();
    return trimmed && trimmed.length <= 100 ? trimmed : null;
};

export const placeOrder = async (userId, addressId, couponCode, paymentMethod = 'COD', rawIdempotencyKey = null) => {
    if (!['COD', 'RAZORPAY', 'WALLET'].includes(paymentMethod)) {
        throw new AppError('Unsupported payment method', 400);
    }


    const idempotencyKey = cleanIdempotencyKey(rawIdempotencyKey);
    if (idempotencyKey) {
        const existing = await paymentRepository.findOrderByKey(userId, idempotencyKey);
        if (existing) {
            if (existing.paymentMethod !== paymentMethod) {
                throw new AppError('This checkout was already submitted. Please refresh the page.', 409);
            }
            return existing;
        }
    }

    const cart = await cartService.getCartDetails(userId);
    if (cart.items.length === 0) throw new AppError('Your bag is empty', 400);

    const unavailableItem = cart.items.find((i) => i.unavailable || i.quantity > i.stock);
    if (unavailableItem) {
        throw new AppError(`"${unavailableItem.name}" is no longer available in the requested quantity`, 409);
    }

    const addresses = await addressService.getAddresses(userId);
    const address = addresses.find((a) => a._id.toString() === String(addressId));
    if (!address) throw new AppError('Please select a valid delivery address', 400);

    let discountAmount = 0;
    let appliedCoupon = null;
    if (couponCode) {
        const result = await validateCoupon(userId, couponCode, cart.subtotal);
        discountAmount = result.discountAmount;
        appliedCoupon = result.coupon;
    }

    const pricing = computePricing(cart.subtotal, discountAmount);

    // Friendly early check. The real, race-proof check is the atomic debit below.
    if (paymentMethod === 'WALLET') {
        const balance = await walletService.getBalance(userId);
        if (balance < pricing.total) {
            throw new AppError('Your wallet balance is not enough for this order', 409);
        }
    }

    const generateOrderCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 10);
    const orderCode = `ORD-${generateOrderCode()}`;

    const orderData = {
        userId,
        orderCode,
        items: cart.items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            name: i.name,
            brand: i.brand,
            image: i.image,
            size: i.size,
            price: i.price,
            quantity: i.quantity,
            lineTotal: i.lineTotal
        })),
        shippingAddress: {
            fullName: address.fullName,
            phone: address.phone,
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            country: address.country
        },
        pricing,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        paymentMethod,
        paymentStatus: 'pending',
        status: 'pending',
        idempotencyKey: idempotencyKey || undefined
    };

    let order;
    try {
        order = await orderRepository.createOrder(orderData);
    } catch (err) {

        if (err.code === 11000 && idempotencyKey) {
            const winner = await paymentRepository.findOrderByKey(userId, idempotencyKey);
            if (winner) return winner;
        }
        throw err;
    }


    if (paymentMethod === 'RAZORPAY') return order;


    if (paymentMethod === 'WALLET') {
        try {
            await walletService.debitWallet({
                userId,
                amount: pricing.total,
                reason: 'order_payment',
                orderId: order._id,
                refKey: `pay:${order._id}`,
                description: `Payment for order ${order.orderCode}`
            });
        } catch (err) {
            await paymentRepository.deleteUnpaidOrder(order._id, userId);
            throw err;
        }
    }

    try {
        await finalizeOrder(order);
    } catch (err) {

        if (paymentMethod === 'WALLET') {
            await walletService.creditWallet({
                userId,
                amount: pricing.total,
                reason: 'order_payment_reversal',
                orderId: order._id,
                refKey: `payfail:${order._id}`,
                description: `Reversal — order ${order.orderCode} could not be placed`
            });
        }
        await paymentRepository.deleteUnpaidOrder(order._id, userId);
        throw err;
    }

    if (paymentMethod === 'WALLET') {
        return (await paymentRepository.markPaidByWallet(order._id)) || order;
    }

    return order;
};