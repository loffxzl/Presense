import {catchAsync} from '../../utils/catchAsync.js';
import * as wishlistService from '../../services/user/wishlistService.js';

export const getWishlist = catchAsync(async (req, res) => {
    const data = await wishlistService.getWishlist(req.user._id);
    res.render('user/wishlist', {
        ...data,
        title: 'Your Wishlist'
    });
});

export const addToWishlist = catchAsync(async (req, res) => {
    const { productId } = req.body;
    const data = await wishlistService.addToWishlist(req.user._id, productId);
    res.status(200).json({ success: true, ...data });
});

export const removeFromWishlist = catchAsync(async (req, res) => {
    const { productId } = req.params;
    const data = await wishlistService.removeFromWishlist(req.user._id, productId);
    res.status(200).json({ success: true, ...data });
});