import * as productRepository from '../../repositories/productRepository.js';
import { ProductFilter, SORT_OPTIONS, PRICE_SORT_DIRECTIONS } from '../../validators/user/productFilters.js'
import * as wishlistRepository from '../../repositories/wishlistRepository.js';
import { summarizeProductPrice } from '../../utils/pricing.js';


export const listProduct = async ({page = 1, limit = 4, search = '', categoryId = '',sortby = "newest", minPrice , maxPrice, userId } = {}) => {


const filter = ProductFilter({search, categoryId});
const currentPage = Math.max(1,parseInt(page));
const skip = (currentPage - 1) * limit;
const now = new Date();

const priceDirection = PRICE_SORT_DIRECTIONS[sortby];
const sort = priceDirection ? { lowestPrice: priceDirection } : (SORT_OPTIONS[sortby] || SORT_OPTIONS.newest);

const [ rawProducts , totalProducts, wishlistProductIds ] = await Promise.all([
        productRepository.findListing({ filter, minPrice, maxPrice, sort, skip, limit, now }),
        productRepository.countListing({ filter, minPrice, maxPrice, now }),
        wishlistRepository.findWishlistProductIds(userId)
    ]);


const products = rawProducts.map((p) => ({
    ...p,
    brand: p.brandId?.name || '',
    pricing: summarizeProductPrice(p, p.category, now)
}));

const totalPages = Math.ceil(totalProducts/limit);
return { products, totalProducts, totalPages, currentPage, search, wishlistProductIds};
};