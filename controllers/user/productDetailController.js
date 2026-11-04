import { catchAsync } from '../../utils/catchAsync.js';
import * as productDetailService from '../../services/user/productDetailService.js';

export const getProductDetail = catchAsync(async (req, res) => {
    const { slug } = req.params;
    const size = typeof req.query.size === 'string' ? req.query.size.trim() : undefined;

    const userId = res.locals.user?._id || null;

    const result = await productDetailService.findProductDetail({
        slug,
        sizeby: size || undefined,
        userId
    });

    if (!result) return res.redirect('/products');

    const { product, similarProduct, isWishlisted, category, offer, variantPricing, similarPricing } = result;

    res.render('user/product-detail', {
        product,
        similarProduct,
        isWishlisted,
        category,
        offer,
        variantPricing,
        similarPricing,
        title: product.name
    });
});

// export const postProductReview = catchAsync(async (req, res) => {
//
// });

// export const deleteProductReview = catchAsync(async (req, res) => {
//
// });