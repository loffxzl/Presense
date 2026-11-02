import * as categorieRepository from '../../repositories/categorieRepository.js';
import { z } from 'zod';
import slugify from "slugify";
import AppError from '../../utils/AppError.js';
import {escapeRegex} from '../../utils/escapeRegex.js';


const categorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  description: z.string().trim().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).optional()
});

const MAX_OFFER_PERCENT = 90;


const parseOffer = (data) => {
  const rawPercent = String(data.offerPercent ?? '').trim();
  if (!rawPercent) return null;

  const percent = Number(rawPercent);
  if (!Number.isFinite(percent) || percent < 1 || percent > MAX_OFFER_PERCENT) {
    throw new AppError(`Offer must be between 1% and ${MAX_OFFER_PERCENT}%`, 400);
  }

  const rawExpiry = String(data.offerExpiry ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawExpiry)) throw new AppError('Please choose an offer expiry date', 400);

  // the offer runs until the end of that day, Indian time
  const expiryDate = new Date(`${rawExpiry}T23:59:59+05:30`);
  if (Number.isNaN(expiryDate.getTime())) throw new AppError('Offer expiry date is invalid', 400);

  const isActive = data.offerActive === 'on' || data.offerActive === 'true' || data.offerActive === true;
  if (isActive && expiryDate <= new Date()) throw new AppError('Offer expiry must be in the future', 400);

  const label = String(data.offerLabel ?? '').trim().slice(0, 40) || `${percent}% off`;

  return { label, discountPercent: percent, expiryDate, isActive };
};


export const getCategoryList = async ({ page = 1, limit = 10, search = '' } = {}) => {
    const filter = { isDeleted: { $ne: true } };

  if (search.trim()) {
    filter.name = { $regex: new RegExp(escapeRegex(search.trim()), 'i') };
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
    const offer = parseOffer(data);

    const DuplicateCategory = await categorieRepository.findCategoryByOne({ 
      name: {$regex:`^${escapeRegex(name.trim())}$`, $options: 'i'},
      isDeleted: {$ne: true}});

    if(DuplicateCategory) throw new AppError('name already exists', 409);

    const slug = generateSlug(name);

    return  categorieRepository.addCategory({ name, description, status: status || 'active', slug, imageUrl, ...(offer ? { offer } : {}) });
};

export const editCategory = async (categoryId, data, imageUrl = null) => {
    const parsed = categorySchema.safeParse(data);

    if(!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);

    const ExistCatagory = await categorieRepository.findCategoryById(categoryId);

    if(!ExistCatagory) throw new AppError('Category not found', 404);

    const { name , description, status } = parsed.data;
    const offer = parseOffer(data);   // null clears the offer

    const generateSlug = (name) => slugify(name, { lower: true, strict: true, trim: true });

    const slug = generateSlug(name) || ExistCatagory.slug;


    const DuplicateCategory = await categorieRepository.findCategoryByOne({ 
      _id: { $ne: categoryId },
      name: {$regex:`^${escapeRegex(name.trim())}$`, $options: 'i'},
      isDeleted: {$ne: true}});

    if(DuplicateCategory) throw new AppError('name already exists', 409);

    return  categorieRepository.editCategory(categoryId,{
          name : name || ExistCatagory.name
        , slug : slug
        , description : description || ExistCatagory.description
        , status: status || 'active'
        , imageUrl : imageUrl || ExistCatagory.imageUrl
        , offer
    });
};

export const deleteCategory = async (categoryId) => {

    const ExistCatagory = await categorieRepository.findCategoryById(categoryId);

    if(!ExistCatagory) throw new AppError('Category not found', 404);

    return  categorieRepository.deleteCategory(categoryId);
}