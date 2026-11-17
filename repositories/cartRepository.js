import Cart from '../models/Cart.js';


export const findCartByUser = async (userId) => {
    return await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        populate: { path: 'categoryId', select: 'name status offer isDeleted' }
    });
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
    const cart = await Cart.findOne({ userId })
        .select('items.productId items.quantity')
        .populate({ path: 'items.productId', select: 'isDeleted status' });
    if (!cart) return 0;

    return cart.items.reduce((sum, item) => {
        const product = item.productId; // null if the product was hard-deleted
        if (!product || product.isDeleted || product.status !== 'active') return sum;
        return sum + item.quantity;
    }, 0);
};

