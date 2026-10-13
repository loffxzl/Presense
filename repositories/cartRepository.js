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

export const getCartItemCount = async (userId) => {
    let cart = await Cart.findOne({userId}).select('items.quantity');
    if(!cart) return 0;
    return cart.items.reduce((sum,item) => sum + item.quantity ,0);
};