import * as categorieRepository from "../repositories/categorieRepository.js";
import { z } from 'zod';
import slugify from "slugify";
import AppError from '../utils/AppError.js';

const categorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  description: z.string().trim().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).optional()
});


export const getCategoryList = async ({ page = 1, limit = 10, search = '' } = {}) => {
    const filter = { isDeleted: { $ne: true } };

  if (search.trim()) {
    filter.name = { $regex: new RegExp(search.trim(), 'i') };
  }

  const currentPage = Math.max(1,parseInt(page));
  const skip = (currentPage - 1) * limit;
  const sort = { createdAt: -1 };

  const [ categories, totalCategory ] = await Promise.all([
    categorieRepository.findCategory({filter,skip,limit,sort}),
    categorieRepository.countCategory(filter),
  ]);

  const totalPages = Math.ceil(totalCategory/limit)

return { categories, currentPage, totalPages, totalCategories: totalCategory, search };

};

export const addCategoryService = async (data, imageUrl = null) => {
    const generateSlug = (name) => slugify(name, { lower: true, strict: true, trim: true });

    const parsed = categorySchema.safeParse(data);

    if(!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);

    const { name, description, status } = parsed.data;

    const slug = generateSlug(name);

    return  categorieRepository.addCategory({ name, description, status: status || 'active', slug, imageUrl});
}

export const editCategory = async (categoryId, data, imageUrl = null) => {
    const parsed = categorySchema.safeParse(data);

    if(!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);

    const ExistCatagory = await categorieRepository.findCategoryById(categoryId);

    if(!ExistCatagory) throw new AppError('Category not found', 404);

    const { name , description, status } = parsed.data;

    const generateSlug = (name) => slugify(name, { lower: true, strict: true, trim: true });

    const slug = generateSlug(name) || ExistCatagory.slug;

    return  categorieRepository.editCategory(categoryId,{
          name : name || ExistCatagory.name
        , slug : slug
        , description : description || ExistCatagory.description
        , status: status || 'active'
        , imageUrl : imageUrl || ExistCatagory.imageUrl
    });
};

export const deleteCategory = async (categoryId) => {

    const ExistCatagory = await categorieRepository.findCategoryById(categoryId);

    if(!ExistCatagory) throw new AppError('Category not found', 404);

    return  categorieRepository.deleteCategory(categoryId);
}