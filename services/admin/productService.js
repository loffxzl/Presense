import * as productRepository from '../../repositories/productRepository.js';
import slugify from 'slugify';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { productSchema } from '../../validators/productSchema.js';
import AppError from '../../utils/AppError.js';
import { customAlphabet } from 'nanoid';


export const findProducts = async ({page = 1, limit = 10, search = ''} = {}) => {
    const filter = {isDeleted: {$ne: true}};
    if(search.trim()) filter.name = {$regex: new RegExp(search.trim(), 'i')}
    
    const currentPage = Math.max(1,parseInt(page));
    const skip = (currentPage - 1) * limit;
    const sort = { createdAt: -1 };

    const [ products , totalProducts ] = await Promise.all([
        productRepository.findProduct({filter,sort,skip,limit}),
        productRepository.countProduct(filter)
    ]);

    const totalPages = Math.ceil(totalProducts/limit);
    
    return { products, totalProducts, totalPages, currentPage, search};
};

export const addProduct = async (data, images = [])=> {

    const parsed = productSchema.safeParse(data);

    if(!parsed.success) throw new ValidationError(parsed.error.issues[0].message);

    const { name, description, brand, categoryId, concentration, status, varients, offer } = parsed.data;

    const generateSlug = (name) => slugify(name, { lower: true, strict: true, trim: true });

    const slug = await generateSlug(name);

    const existSlug = await productRepository.findProductAny({slug, isDeleted:{$ne:true}});
    if(existSlug) throw new AppError('A product with this name already exists',409);

    const generateProductCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);
    const productCode = `PRD-${generateProductCode()}`; // e.g. "PRD-7K2N9XQP"
    
    return productRepository.addProduct({
        name,
        slug,
        productCode,
        description,
        brand,
        image: images,
        categoryId,
        concentration,
        status: status || 'active',
        varients,
        offer
    });
}

export const editProduct = async (id,data,images)=> {
    const parsed = productSchema.safeParse(data);
    if(!parsed.success) throw new ValidationError(parsed.error.issues[0].message);

    const existProduct = await productRepository.findProductById(id);
    if(!existProduct) throw new NotFoundError(`Product not found`);

    const { name, description, brand, categoryId, concentration, status, varients, offer } = parsed.data;

    const generateSlug = (name) => slugify(name, { lower: true, strict: true, trim: true });
    const slug = generateSlug(name) || existProduct.slug;

    return await productRepository.editProduct(id,{
        name,
        slug,
        productCode:existProduct.productCode,
        description,
        brand,
        image: images || existProduct.image,
        categoryId,
        concentration,
        status: status || 'active',
        varients,
        offer
    });
};

export const deleteProduct = async (id) => {
    const existProduct = await productRepository.findProductById(id);
    if(!existProduct) throw new NotFoundError('Product not found');

    return await productRepository.deleteProduct(id);
};

