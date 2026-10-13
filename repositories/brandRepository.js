import Brand from '../models/Brand.js';
import Product from '../models/Products.js';

export const findBrands = async ({ filter = {}, sort = { name: 1 }, skip = 0, limit = 10 } = {}) => {
    return await Brand.find(filter).sort(sort).skip(skip).limit(limit);
};

export const countBrands = async (filter = {}) => {
    return await Brand.countDocuments(filter);
};


export const findAllActiveBrands = async () => {
    return await Brand.find({ status: 'active' }).sort({ name: 1 });
};

export const findBrandById = async (id) => {
    return await Brand.findById(id);
};

export const createBrand = async (data) => {
    return await Brand.create(data);
};

export const updateBrand = async (id, data) => {
    return await Brand.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

export const deleteBrand = async (id) => {
    return await Brand.findByIdAndDelete(id);
};


export const countProductsUsingBrand = async (brandId) => {
    return await Product.countDocuments({ brandId });
};