import * as wishlistRepository from '../../repositories/wishlistRepository.js';
import * as productRepository from '../../repositories/productRepository.js';
import * as categorieRepository from '../../repositories/categorieRepository.js';
import * as brandRepository from '../../repositories/brandRepository.js';
import { priceVariant, summarizeProductPrice } from '../../utils/pricing.js';
import AppError from '../../utils/AppError.js';

const idOf = (ref) => String(ref && ref._id ? ref._id : ref);

export const getWishlist = async (userId) => {
    const wishlist = await wishlistRepository.findWishlistByUser(userId);
    if (!wishlist || wishlist.items.length === 0) return { items: [] };

    const products = wishlist.items.filter((product) => product && !product.isDeleted);

    // category (for category offers) and brand names, fetched once per unique id
    const categories = await categorieRepository.findCategoriesByIds([...new Set(products.map((p) => idOf(p.categoryId)))]);
    const categoryById = new Map(categories.map((c) => [String(c._id), c]));

    const brandIds = [...new Set(products.map((p) => idOf(p.brandId)).filter((id) => id && id !== 'undefined'))];
    const brands = await Promise.all(brandIds.map((id) => brandRepository.findBrandById(id)));
    const brandNameById = new Map(brands.filter(Boolean).map((b) => [String(b._id), b.name]));

    const now = new Date();
    const items = products.map((product) => {
        const category = categoryById.get(idOf(product.categoryId)) || null;

        const variants = (product.varients || []).map((v) => ({
            variantId: v._id,
            size: v.size,
            stock: v.stock,
            price: priceVariant(v, product, category, now).price   // what the customer pays
        }));
        const summary = summarizeProductPrice(product, category, now);

        return {
            productId: product._id,
            slug: product.slug,
            name: product.name,
            brand: brandNameById.get(idOf(product.brandId)) || product.brand || '',
            image: (product.image && product.image[0]) || null,
            price: summary.price,
            mrp: summary.mrp,
            offerPercent: summary.offerPercent,
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


export const getWishlistProductIds = async (userId) => {
    if (!userId) return [];
    return await wishlistRepository.findWishlistProductIds(userId);
};