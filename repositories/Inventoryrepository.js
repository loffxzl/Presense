import Product from '../models/Products.js';
import StockLog from '../models/StockLog.js';

export const adjustVariantStock = async (productId, variantId, delta) => {
    const filter = { _id: productId, 'varients._id': variantId };

    if (delta < 0) {
        filter['varients.stock'] = { $gte: -delta };
    }

    return await Product.findOneAndUpdate(
        filter,
        { $inc: { 'varients.$.stock': delta } },
        { new: true }
    );
};

export const createStockLog = async (data) => {
    return await StockLog.create(data);
};



const buildVariantPipeline = ({ search = '', lowStockOnly = false, lowStockThreshold = 5 } = {}) => {
    const pipeline = [
        { $unwind: '$varients' },
        {
            $lookup: {
                from: 'brands',
                localField: 'brandId',
                foreignField: '_id',
                as: 'brand'
            }
        },
        { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                productId: '$_id',
                name: 1,
                brandName: '$brand.name',
                image: { $arrayElemAt: ['$image', 0] },
                variantId: '$varients._id',
                size: '$varients.size',
                stock: '$varients.stock',
                basePrice: '$varients.basePrice',
                salePrice: '$varients.salePrice'
            }
        }
    ];

    const matchStage = {};
    if (search.trim()) {
        const pattern = new RegExp(search.trim(), 'i');
        matchStage.$or = [{ name: pattern }, { brandName: pattern }, { size: pattern }];
    }
    if (lowStockOnly) {
        matchStage.stock = { $lte: lowStockThreshold };
    }
    if (Object.keys(matchStage).length) {
        pipeline.push({ $match: matchStage });
    }

    return pipeline;
};

export const getVariantInventory = async ({
    search = '',
    lowStockOnly = false,
    lowStockThreshold = 5,
    sort = { stock: 1 },
    skip = 0,
    limit = 10
} = {}) => {
    const pipeline = buildVariantPipeline({ search, lowStockOnly, lowStockThreshold });
    pipeline.push({ $sort: sort }, { $skip: skip }, { $limit: limit });
    return await Product.aggregate(pipeline);
};

export const countVariantInventory = async ({ search = '', lowStockOnly = false, lowStockThreshold = 5 } = {}) => {
    const pipeline = buildVariantPipeline({ search, lowStockOnly, lowStockThreshold });
    pipeline.push({ $count: 'total' });
    const result = await Product.aggregate(pipeline);
    return result[0]?.total || 0;
};

export const findProductById = async (productId) => {
    return await Product.findById(productId);
};

export const findStockLogs = async ({ filter = {}, skip = 0, limit = 20 } = {}) => {
    return await StockLog.find(filter)
        .populate('productId', 'name')
        .populate('performedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

export const countStockLogs = async (filter = {}) => {
    return await StockLog.countDocuments(filter);
};