import * as productRepository from '../../repositories/productRepository.js';
import { NotFoundError, OutOfStockError } from '../../utils/errors.js';
import * as wishlistRepository from '../../repositories/wishlistRepository.js';
import * as categorieRepository from '../../repositories/categorieRepository.js';
import { findBrandById } from '../../repositories/brandRepository.js';
import { getBestOffer, priceVariant, summarizeProductPrice } from '../../utils/pricing.js';

export const findProductDetail = async ({ slug, sizeby, limit = 4, userId = null }) => {
    if (!slug || typeof slug !== 'string') return false;

    const filter = {
        slug,
        isDeleted: { $ne: true },
        status: { $ne: 'unlisted' }
    };

    const product = await productRepository.findProductAny(filter);
    if (!product) return false;

    const variants = Array.isArray(product.varients) ? product.varients : [];

    // Size check (only when a size was requested)
    if (sizeby) {
        const selected = variants.find((v) => v.size === sizeby);
        if (!selected) throw new NotFoundError('Selected size is not available for this product');
        if (selected.stock === 0) throw new OutOfStockError(`${product.name} (${sizeby}) is currently sold out`);
    }

    const similarFilter = {
        brandId: product.brandId,
        _id: { $ne: product._id },
        isDeleted: { $ne: true },
        status: { $ne: 'unlisted' }
    };


    const [similarProduct, wishlistIds, brand] = await Promise.all([
        productRepository.findAllProduct(similarFilter, limit),
        userId ? wishlistRepository.findWishlistProductIds(userId) : Promise.resolve([]),
        product.brandId ? findBrandById(product.brandId) : Promise.resolve(null)
    ]);

    const similar = Array.isArray(similarProduct) ? similarProduct : [];
    const isWishlisted = (wishlistIds || []).map(String).includes(String(product._id));

    product.brand = brand?.name || '';


    const categoryIds = [
        ...new Set(
            [product.categoryId, ...similar.map((p) => p.categoryId)]
                .filter(Boolean)
                .map(String)
        )
    ];
    const categories = categoryIds.length
        ? await categorieRepository.findCategoriesByIds(categoryIds)
        : [];
    const categoryById = new Map(categories.map((c) => [String(c._id), c]));
    const category = categoryById.get(String(product.categoryId)) || null;

    const now = new Date();
    const offer = getBestOffer(product, category, now);

    const variantPricing = variants.map((v) => ({
        variantId: String(v._id),
        ...priceVariant(v, product, category, now)
    }));

    const similarPricing = {};
    similar.forEach((p) => {
        similarPricing[String(p._id)] = summarizeProductPrice(
            p,
            categoryById.get(String(p.categoryId)) || null,
            now
        );
    });

    return {
        product,
        similarProduct: similar,
        isWishlisted,
        category,
        offer,
        variantPricing,
        similarPricing
    };
};