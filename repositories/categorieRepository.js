import Category from "../models/Category.js";

export const findCategory = async ( { filter, skip, limit, sort } ) => {
        //console.log(filter)
    return await Category.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

export const addCategory = async (data) => {
    return await Category.create(data);
};

export const editCategory = async (categoryId, data) => {
    return await Category.findByIdAndUpdate(categoryId,data, {new: true, runValidators: true});
}

export const deleteCategory = async (categoryId) => {
    return await Category.findByIdAndUpdate(categoryId,{ $set: {isDeleted: true }},{ new: true});
}

export const findCategoryById = async (categoryId) => {
    return await Category.findById(categoryId);
};

export const findCategoriesByIds = async (ids) => {
    return await Category.find({ _id: { $in: ids } }).select('name status offer isDeleted').lean();
};

export const countCategory = async (filter)=> {
    return await Category.countDocuments(filter);
}

export const findCategoryByOne = async(filter) => {
    return await Category.findOne(filter);
}