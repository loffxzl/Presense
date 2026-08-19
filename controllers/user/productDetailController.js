import { catchAsync } from '../../utils/catchAsync.js';
import * as productDetailService from '../../services/user/productDetailService.js'

export const getProductDetail = catchAsync( async(req, res)=> {
    const {slug} = req.params;
    const {size}  = req.query;

    const result = await productDetailService.findProductDetail({slug,sizeby:size, userId: res.locals.user._id});
    if(!result) return res.redirect('/products');

    const {product,similarProduct, isWishlisted} = result;

    res.render('user/product-detail',{
        product,
        similarProduct,
        isWishlisted,
        title: product.name
    })
})

// export const postProductReview = catchAsync( async(req, res)=> {
    
// })

// export const deleteProductReview = catchAsync( async(req,res) => {

// })