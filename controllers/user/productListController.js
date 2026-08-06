import {catchAsync} from '../../utils/catchAsync.js';
import * as productService from '../../services/user/productListService.js';
import * as categoryService from '../../services/admin/categoryService.js';

export const getProduct = catchAsync(async (req, res) => {
    const { page = 1, search = '', categoryId = '', sortby = 'newest', minPrice, maxPrice } = req.query;

    const data = await productService.listProduct({ page, limit: 10, search, categoryId, sortby, minPrice, maxPrice });
    const categoryData = await categoryService.getCategoryList({ page: 1, limit: 1000 });

    return res.render('user/product-listing', {
        ...data,
        title: 'fragrances',
        categoryId,
        categories: categoryData.categories,
        search,
        sortby,
        minPrice,
        maxPrice
    });
});