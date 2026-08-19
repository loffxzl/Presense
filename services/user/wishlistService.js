import * as wishlistRepository from '../../repositories/wishlistRepository.js';
import * as productRepository from '../../repositories/productRepository.js';
import AppError from '../../utils/AppError.js';


export const getWishlist = async (userId) => {
    const wishlist = await wishlistRepository.findWishlistByUser(userId);
    if (!wishlist || wishlist.items.length === 0) return { items: [] };

    const items = wishlist.items
        .filter((product) => product && !product.isDeleted)
        .map((product) => {

            const variants = (product.varients || []).map((v) => ({
                variantId: v._id,
                size: v.size,
                stock: v.stock,
                price: v.salePrice
            }));
            const firstVariant = variants[0] || {};

            return {
                productId: product._id,
                slug: product.slug,
                name: product.name,
                brand: product.brand,
                image: (product.image && product.image[0]) || null,
                price: firstVariant.price ?? null,
                inStock: variants.some((v) => v.stock > 0),
                variants
            };
        });

    return { items };
};

export const addToWishlist = async (userId, productId) => {
    const product = await productRepository.findProductById(productId);
    if (!product || product.isDeleted) throw new AppError('Product not found', 404);

    await wishlistRepository.addItem(userId, productId);
    return { inWishlist: true };
};

export const removeFromWishlist = async (userId, productId) => {
    await wishlistRepository.removeItem(userId, productId);
    return { inWishlist: false };
};

// Used by listing/detail pages to know which hearts should render filled —
// cheap id-only lookup, not a full wishlist fetch.
export const getWishlistProductIds = async (userId) => {
    if (!userId) return [];
    return await wishlistRepository.findWishlistProductIds(userId);
};