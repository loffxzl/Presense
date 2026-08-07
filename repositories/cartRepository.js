import Cart from '../models/Cart.js';


export const findCartByUser = async (userId) => {
    return await Cart.findOne({ userId }).populate('items.productId');
};


export const findRawCartByUser = async (userId) => {
    return await Cart.findOne({ userId });
};

export const createCart = async (userId) => {
    return await Cart.create({ userId, items: [] });
};

export const saveCart = async (cart) => {
    return await cart.save();
};