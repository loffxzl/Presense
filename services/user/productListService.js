import * as productRepository from '../../repositories/productRepository.js';
import { ProductFilter, SORT_OPTIONS, PRICE_SORT_DIRECTIONS } from '../../validators/user/productFilters.js'
import * as wishlistRepository from '../../repositories/wishlistRepository.js';


export const listProduct = async ({page = 1, limit = 4, search = '', categoryId = '',sortby = "newest", minPrice , maxPrice, userId } = {}) => {

const filter = ProductFilter({search, categoryId, minPrice, maxPrice});
const currentPage = Math.max(1,parseInt(page));
const skip = (currentPage - 1) * limit;

const priceDirection = PRICE_SORT_DIRECTIONS[sortby];
const productsQuery = priceDirection
    ? productRepository.findProductByLowestPrice({ filter, direction: priceDirection, skip, limit })
    : productRepository.findProduct({ filter, sort: SORT_OPTIONS[sortby] || SORT_OPTIONS.newest, skip, limit });

const [ products , totalProducts, wishlistProductIds ] = await Promise.all([
        productsQuery,
        productRepository.countProduct(filter),
        wishlistRepository.findWishlistProductIds(userId)
    ]);

const totalPages = Math.ceil(totalProducts/limit);
return { products, totalProducts, totalPages, currentPage, search, wishlistProductIds};
};