import * as productRepository from '../../repositories/productRepository.js';
import { ProductFilter, SORT_OPTIONS} from '../../validators/user/productFilters.js'
import * as wishlistRepository from '../../repositories/wishlistRepository.js';


export const listProduct = async ({page = 1, limit = 10, search = '', categoryId = '',sortby = "newest", minPrice , maxPrice, userId } = {}) => {

    const filter = ProductFilter({search, categoryId, minPrice, maxPrice});
    const sort = SORT_OPTIONS[sortby] || SORT_OPTIONS.newest
    
    const currentPage = Math.max(1,parseInt(page));
    const skip = (currentPage - 1) * limit;
    

    const [ products , totalProducts, wishlistProductIds ] = await Promise.all([
        productRepository.findProduct({filter,sort,skip,limit}),
        productRepository.countProduct(filter),
        wishlistRepository.findWishlistProductIds(userId)
    ]);

    const totalPages = Math.ceil(totalProducts/limit);
    
    return { products, totalProducts, totalPages, currentPage, search, wishlistProductIds};
};
