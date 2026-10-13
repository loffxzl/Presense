import { customAlphabet } from 'nanoid';
import * as cartService from './user/cartService.js';
import * as addressService from './user/addressService.js';
import * as orderRepository from '../repositories/orderRepository.js';
import * as inventoryRepository from '../repositories/inventoryRepository.js';
import * as couponRepository from '../repositories/couponRepository.js';
import AppError from '../utils/AppError.js';

const TAX_RATE = 0.05;             // 5% — set to 0 to disable tax entirely
const FREE_SHIPPING_THRESHOLD = 999;
const FLAT_SHIPPING_FEE = 49;

const computePricing = (subtotal, discount = 0) => {
    const tax = Math.round(subtotal * TAX_RATE);
    const shippingFee = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
    const total = Math.max(subtotal + tax - discount + shippingFee, 0);
    return { subtotal, tax, discount, shippingFee, total };
};

// Pure — no DB calls, no throwing. Shared by validateCoupon and the
// available-coupons preview so the "you save ₹X" math is never duplicated.
const calcDiscount = (coupon, subtotal) => {
    if (coupon.discountType === 'percentage') {
        let discountAmount = Math.round(subtotal * (coupon.discountValue / 100));
        if (coupon.maxDiscountAmount) discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
        return discountAmount;
    }
    return Math.min(coupon.discountValue, subtotal); // never discount more than the order is worth
};

// Re-derives the discount from the coupon's own rules every time — never trusts
// a discount amount supplied by the client. Used both for the "Apply Coupon"
// preview and, separately and authoritatively, at actual order placement.
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

// Coupons worth showing the user at checkout — structurally eligible ones
// (active, not expired, minimum met, global limit not exhausted) further
// filtered by THIS user's own usage count, with a "you save ₹X" preview attached.
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

// Preview only — validates the coupon and returns recomputed pricing, but does
// NOT increment usedCount. Actual redemption only happens on successful order placement.
export const previewCoupon = async (userId, code) => {
    const cart = await cartService.getCartDetails(userId);
    if (cart.items.length === 0) throw new AppError('Your bag is empty', 400);

    const { coupon, discountAmount } = await validateCoupon(userId, code, cart.subtotal);
    const pricing = computePricing(cart.subtotal, discountAmount);

    return { pricing, code: coupon.code };
};

// NOTE: stock is decremented per item in a loop below, with no Mongo transaction wrapping it.
// If your DB is a replica set (e.g. MongoDB Atlas), wrap the loop in a session/transaction
// so a mid-order failure rolls back earlier decrements instead of leaving them applied.
export const placeOrder = async (userId, addressId, couponCode) => {
    const cart = await cartService.getCartDetails(userId);
    if (cart.items.length === 0) throw new AppError('Your bag is empty', 400);

    const unavailableItem = cart.items.find((i) => i.unavailable || i.quantity > i.stock);
    if (unavailableItem) {
        throw new AppError(`"${unavailableItem.name}" is no longer available in the requested quantity`, 409);
    }

    const addresses = await addressService.getAddresses(userId);
    const address = addresses.find((a) => a._id.toString() === String(addressId));
    if (!address) throw new AppError('Please select a valid delivery address', 400);

    // Re-validate the coupon here even if it was already "applied" client-side —
    // the client's number is never trusted for the actual charge.
    let discountAmount = 0;
    let appliedCoupon = null;
    if (couponCode) {
        const result = await validateCoupon(userId, couponCode, cart.subtotal);
        discountAmount = result.discountAmount;
        appliedCoupon = result.coupon;
    }

    const pricing = computePricing(cart.subtotal, discountAmount);

    for (const item of cart.items) {
        const updated = await inventoryRepository.adjustVariantStock(item.productId, item.variantId, -item.quantity);
        if (!updated) throw new AppError(`"${item.name}" went out of stock — please update your bag`, 409);

        const variant = updated.varients.id(item.variantId);
        await inventoryRepository.createStockLog({
            productId: item.productId,
            variantId: item.variantId,
            size: item.size,
            type: 'sale',
            quantityChange: -item.quantity,
            previousStock: variant.stock + item.quantity,
            newStock: variant.stock,
            note: 'Order placed (COD)',
            performedBy: null
        });
    }

    const generateOrderCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 10);
    const orderCode = `ORD-${generateOrderCode()}`;

    const order = await orderRepository.createOrder({
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
        paymentMethod: 'COD',
        status: 'pending'
    });

    // Only increment usage AFTER the order is successfully created — a failed
    // order (e.g. stock ran out mid-loop) should not consume the coupon.
    if (appliedCoupon) {
        await couponRepository.incrementUsage(appliedCoupon.code);
    }

    await cartService.clearCart(userId);

    return order;
};