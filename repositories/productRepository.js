import Product from '../models/Products.js';

export const findProduct = async ({filter,sort,skip,limit}) =>{
    return await Product.find(filter).sort(sort).skip(skip).limit(limit);
};

export const addProduct = async (data)=>{
    return await Product.create(data)
};

export const editProduct = async (id,data) =>{
    return await Product.findByIdAndUpdate(id,data);
};

export const deleteProduct = async (id) => {
    return await Product.findByIdAndUpdate(id, {$set: {isDeleted: true}}, {new: true});
};

export const findProductById = async(id) => {
    return await Product.findById(id);
};

export const countProduct = async (filter)=> {
    return Product.countDocuments(filter);
};

export const findProductAny = async (filter) => {
    return Product.findOne(filter);
}
