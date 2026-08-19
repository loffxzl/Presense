import Wishlist from '../models/Wishlist.js';

export const findWishlistByUser = async (userId) => {
    return await Wishlist.findOne({ userId }).populate('items');
};


export const addItem = async (userId, productId) => {
    return await Wishlist.findOneAndUpdate(
        { userId },
        { $addToSet: { items: productId } },
        { new: true, upsert: true }
    );
};

export const removeItem = async (userId, productId) => {
    return await Wishlist.findOneAndUpdate(
        { userId },
        { $pull: { items: productId } },
        { new: true }
    );
};


export const findWishlistProductIds = async (userId) => {
    const wishlist = await Wishlist.findOne({ userId }).select('items');
    return wishlist ? wishlist.items.map((id) => id.toString()) : [];
};
