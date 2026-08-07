import * as cartRepository from '../../repositories/cartRepository.js';
import * as productRepository from '../../repositories/productRepository.js';
import AppError from '../../utils/AppError.js';

const getOrCreateCart = async (userId) => {
    let cart = await cartRepository.findRawCartByUser(userId);
    if (!cart) cart = await cartRepository.createCart(userId);
    return cart;
};

const findItem = (cart, productId, variantId) =>
    cart.items.find(
        (i) => i.productId.toString() === String(productId) && i.variantId.toString() === String(variantId)
    );

// Shapes the cart into what the view/JSON response actually needs
export const getCartDetails = async (userId) => {
    const cart = await cartRepository.findCartByUser(userId);
    if (!cart || cart.items.length === 0) return { items: [], subtotal: 0 };

    const items = cart.items
        .filter((item) => item.productId && !item.productId.isDeleted) // guard against removed/deleted products
        .map((item) => {
            const product = item.productId;
            const variant = product.varients.id(item.variantId);
            const price = variant ? variant.salePrice : item.priceAtAdd;

            return {
                productId: product._id,
                variantId: item.variantId,
                slug: product.slug,
                name: product.name,
                brand: product.brand,
                image: (product.image && product.image[0]) || null,
                size: variant ? variant.size : '—',
                price,
                quantity: item.quantity,
                stock: variant ? variant.stock : 0,
                unavailable: !variant, // size/variant no longer exists on the product
                lineTotal: price * item.quantity
            };
        });

    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);

    return { items, subtotal };
};

export const addItem = async (userId, productId, variantId, quantity = 1) => {
    if (quantity < 1) throw new AppError('Quantity must be at least 1', 400);

    const product = await productRepository.findProductById(productId);
    if (!product || product.isDeleted) throw new AppError('Product not found', 404);

    const variant = product.varients.id(variantId);
    if (!variant) throw new AppError('Selected size is unavailable', 404);

    const cart = await getOrCreateCart(userId);
    const existingItem = findItem(cart, productId, variantId);
    const desiredQuantity = existingItem ? existingItem.quantity + quantity : quantity;

    if (desiredQuantity > variant.stock) throw new AppError('Not enough stock available', 409);

    if (existingItem) {
        existingItem.quantity = desiredQuantity;
        existingItem.priceAtAdd = variant.salePrice;
    } else {
        cart.items.push({ productId, variantId, quantity, priceAtAdd: variant.salePrice });
    }

    await cartRepository.saveCart(cart);
    return getCartDetails(userId);
};

export const updateItemQuantity = async (userId, productId, variantId, quantity) => {
    if (quantity < 1) throw new AppError('Quantity must be at least 1', 400);

    const product = await productRepository.findProductById(productId);
    if (!product) throw new AppError('Product not found', 404);

    const variant = product.varients.id(variantId);
    if (!variant) throw new AppError('Selected size is unavailable', 404);
    if (quantity > variant.stock) throw new AppError('Not enough stock available', 409);

    const cart = await getOrCreateCart(userId);
    const item = findItem(cart, productId, variantId);
    if (!item) throw new AppError('Item not in cart', 404);

    item.quantity = quantity;
    await cartRepository.saveCart(cart);
    return getCartDetails(userId);
};

export const removeItem = async (userId, productId, variantId) => {
    const cart = await getOrCreateCart(userId);
    cart.items = cart.items.filter(
        (i) => !(i.productId.toString() === String(productId) && i.variantId.toString() === String(variantId))
    );
    await cartRepository.saveCart(cart);
    return getCartDetails(userId);
};

export const clearCart = async (userId) => {
    const cart = await getOrCreateCart(userId);
    cart.items = [];
    await cartRepository.saveCart(cart);
    return { items: [], subtotal: 0 };
};