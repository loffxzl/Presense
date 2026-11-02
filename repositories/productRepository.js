import mongoose from 'mongoose';
import Product from '../models/Products.js';
import { offerPercentExpr, variantPricesExpr } from '../utils/pricing.js';


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


const listingStages = ({ filter, minPrice, maxPrice, now }) => {
    const match = { ...filter };
    if (match.categoryId && mongoose.isValidObjectId(match.categoryId)) {
        match.categoryId = new mongoose.Types.ObjectId(match.categoryId);
    }

    const stages = [
        { $match: match },
        { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'category' } },
        { $unwind: '$category' },
        // products in a hidden/deleted category are not for sale
        { $match: { 'category.status': 'active', 'category.isDeleted': { $ne: true } } },
        { $addFields: { offerPercent: offerPercentExpr(now) } },
        { $addFields: { variantPrices: variantPricesExpr() } },
        { $addFields: { lowestPrice: { $min: '$variantPrices' } } }
    ];

    const min = minPrice !== undefined && minPrice !== '' ? Number(minPrice) : null;
    const max = maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : null;
    if (Number.isFinite(min) || Number.isFinite(max)) {
        // same meaning as before: some size of the product falls inside the range
        const inRange = [];
        if (Number.isFinite(min)) inRange.push({ $gte: ['$$p', min] });
        if (Number.isFinite(max)) inRange.push({ $lte: ['$$p', max] });
        stages.push({
            $match: { $expr: { $anyElementTrue: { $map: { input: '$variantPrices', as: 'p', in: { $and: inRange } } } } }
        });
    }
    return stages;
};

export const findListing = async ({ filter, minPrice, maxPrice, sort, skip, limit, now = new Date() }) =>
    Product.aggregate([
        ...listingStages({ filter, minPrice, maxPrice, now }),
        { $sort: { ...sort, _id: 1 } },
        { $skip: skip },
        { $limit: limit },
        { $lookup: { from: 'brands', localField: 'brandId', foreignField: '_id', as: 'brandId' } },
        { $unwind: { path: '$brandId', preserveNullAndEmptyArrays: true } }
    ]);

export const countListing = async ({ filter, minPrice, maxPrice, now = new Date() }) => {
    const [row] = await Product.aggregate([
        ...listingStages({ filter, minPrice, maxPrice, now }),
        { $count: 'total' }
    ]);
    return row ? row.total : 0;
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