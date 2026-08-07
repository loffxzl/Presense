import {catchAsync} from '../../utils/catchAsync.js';
import * as cartService from '../../services/user/cartService.js';

export const getCart = catchAsync(async (req, res) => {
    const data = await cartService.getCartDetails(req.user._id);
    res.render('user/cart', {
        ...data,
        title: 'Your Bag'
    });
});

export const addToCart = catchAsync(async (req, res) => {
    const { productId, variantId, quantity } = req.body;
    const data = await cartService.addItem(req.user._id, productId, variantId, Number(quantity) || 1);
    res.status(200).json({ success: true, ...data });
});

export const updateQuantity = catchAsync(async (req, res) => {
    const { productId, variantId } = req.params;
    const { quantity } = req.body;
    const data = await cartService.updateItemQuantity(req.user._id, productId, variantId, Number(quantity));
    res.status(200).json({ success: true, ...data });
});

export const removeFromCart = catchAsync(async (req, res) => {
    const { productId, variantId } = req.params;
    const data = await cartService.removeItem(req.user._id, productId, variantId);
    res.status(200).json({ success: true, ...data });
});

export const clearCart = catchAsync(async (req, res) => {
    const data = await cartService.clearCart(req.user._id);
    res.status(200).json({ success: true, ...data });
});