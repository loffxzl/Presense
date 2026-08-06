import * as productRepository from '../../repositories/productRepository.js';
import { NotFoundError, OutOfStockError } from '../../utils/errors.js'

export const findProductDetail = async ({slug, sizeby, limit = 4}) => {
    const filter = {
        slug,
        isDeleted: {$ne: true},
        status: {$ne: 'unlisted'}
    };

    const product = await productRepository.findProductAny(filter);
    if(!product) return false;

    const similarFilter = {
    brand: product.brand,
    _id: { $ne: product._id },
    isDeleted: { $ne: true },
    status: { $ne: 'unlisted' }
    };
    similarFilter.brand = product.brand;
    const similarProduct = await productRepository.findAllProduct(similarFilter,limit);

    if (sizeby) {
        const isAvailabe = product.varients.find(v => v.size === sizeby);
        if (!isAvailabe) throw new NotFoundError('Selected size is not available for this product');
        if (isAvailabe.stock === 0) throw new OutOfStockError(`${product.name} (${sizeby}) is currently sold out`);
    }


    return {product, similarProduct};
}








// c. Product details page
// i. Zoomable images
// ii. Breadcrumbs, ratings, price, discounts/coupons, reviews, stock info
// iii. Error handling for sold out/unavailable/out of stock done
// iv. Product highlights and related product recommendations done
// v. Redirect to listing if product blocked/unavailable (on refresh or actions) done