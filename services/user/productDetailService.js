import * as productRepository from '../../repositories/productRepository.js';
import { NotFoundError, OutOfStockError } from '../../utils/errors.js'
import * as wishlistRepository from '../../repositories/wishlistRepository.js';
import * as categorieRepository from '../../repositories/categorieRepository.js';
import { findBrandById } from '../../repositories/brandRepository.js';
import { getBestOffer, priceVariant, summarizeProductPrice } from '../../utils/pricing.js';
import {findCategoryById} from '../../repositories/categorieRepository.js';

export const findProductDetail = async ({slug, sizeby, limit = 4, userId}) => {
    const filter = {
        slug,
        isDeleted: {$ne: true},
        status: {$ne: 'unlisted'}
    };

    const product = await productRepository.findProductAny(filter);
    if(!product) return false;

    const similarFilter = {
    brandId: product.brandId,
    _id: { $ne: product._id },
    isDeleted: { $ne: true },
    status: { $ne: 'unlisted' }
    };
    const similarProduct = await productRepository.findAllProduct(similarFilter,limit);

    if (sizeby) {
        const isAvailabe = product.varients.find(v => v.size === sizeby);
        if (!isAvailabe) throw new NotFoundError('Selected size is not available for this product');
        if (isAvailabe.stock === 0) throw new OutOfStockError(`${product.name} (${sizeby}) is currently sold out`);
    }

    const wishlistProductIds = await wishlistRepository.findWishlistProductIds(userId);
    const isWishlisted = wishlistProductIds.includes(String(product._id));

    const brand = await findBrandById(product.brandId);
    
    product.brand = brand.name;

    // ---- Pricing: the customer gets the higher of product / category offer ----
    const categoryIds = [...new Set([product.categoryId, ...similarProduct.map((p) => p.categoryId)].map(String))];
    const categories = await categorieRepository.findCategoriesByIds(categoryIds);
    const categoryById = new Map(categories.map((c) => [String(c._id), c]));
    const category = categoryById.get(String(product.categoryId)) || null;

    const now = new Date();
    const offer = getBestOffer(product, category, now);
    const variantPricing = product.varients.map((v) => ({
        variantId: String(v._id),
        ...priceVariant(v, product, category, now)
    }));

    const similarPricing = {};
    similarProduct.forEach((p) => {
        similarPricing[String(p._id)] = summarizeProductPrice(p, categoryById.get(String(p.categoryId)) || null, now);
    });


    return { product, similarProduct, isWishlisted, category, offer, variantPricing, similarPricing };
}