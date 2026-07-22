import Category from "../models/Category.js";

export const findCategory = async ( { filter, skip, limit, sort } ) => {
        //console.log(filter)
    return await Category.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

export const addCategory = async (data) => {
    const category = await Category.create(data);
    const { imageUrl } = data;
    console.log(imageUrl)
    return category;
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

export const countCategory = async (filter)=> {
    return await Category.countDocuments(filter);
}