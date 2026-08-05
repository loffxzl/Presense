import * as productService from '../../services/productService.js';
import {catchAsync} from '../../utils/catchAsync.js';
import { getCategoryList } from '../../services/categoryService.js';

export const getProduct = catchAsync(async ( req, res)=>{
    const { page = 1, search = '' } = req.query;
    const data = await productService.findProducts({ page, limit:10, search});
    const categories = await getCategoryList({page : 1 , limit : 1000});
    
    res.render('admin/product',{
        ...data,
        categories: categories.categories,
        title:'Product management',
        search,
        adminName: req.session.admin.name
    })
});

export const addProduct = catchAsync(async (req,res)=>{
    const images = req.files ? req.files.map(file => file.location) : [];
    const data = {
        ...req.body,
        varients: JSON.parse(req.body.varients || '[]')
    }

    await productService.addProduct(data,images);
    
    return res.json({success:true});
});

export const editProduct = catchAsync( async (req,res)=> {
    const id = req.params.id;
    const images = req.files && req.files.length ? req.files.map(file => file.location) : null;
    const data = {
        ...req.body,
        varients:JSON.parse(req.body.varients)
    }
    await productService.editProduct(id,data, images);
    return res.json({success:true});
});

export const deleteProduct = catchAsync(async (req,res)=>{
    const id = req.params.id;
    await productService.deleteProduct(id);

    return res.redirect('admin/product');
});