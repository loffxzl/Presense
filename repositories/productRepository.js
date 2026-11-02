import mongoose from 'mongoose';
import Product from '../models/Products.js';


export const findProduct = async ({filter,sort,skip,limit}) =>{
    return await Product.find(filter).populate('brandId', 'name').sort(sort).skip(skip).limit(limit);
};


export const findProductByLowestPrice = async ({ filter, direction, skip, limit }) => {
    const match = { ...filter };


    if (match.categoryId && mongoose.isValidObjectId(match.categoryId)) {
        match.categoryId = new mongoose.Types.ObjectId(match.categoryId);
    }

    return await Product.aggregate([
        { $match: match },
        { $addFields: { lowestPrice: { $min: '$varients.salePrice' } } },
        { $sort: { lowestPrice: direction, _id: 1 } },
        { $skip: skip },
        { $limit: limit },
        { $lookup: { from: 'brands', localField: 'brandId', foreignField: '_id', as: 'brandId' } },
        { $unwind: { path: '$brandId', preserveNullAndEmptyArrays: true } }
    ]);
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

export const findAllProduct = async(filter,limit) => {
    return await Product.find(filter).limit(limit);
}