import * as categoryService from "../../services/categoryService.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { logger } from '../../utils/logger.js';

export const getCategory = catchAsync(async (req, res) => {
  const { page = 1, search = '' } = req.query;
  const data = await categoryService.getCategoryList({ page, limit: 10, search });
  return res.render('admin/category', {
    ...data,
    title: 'Categories',
    search,
    adminName: req.session.admin.name
  });
});

export const addCategory = catchAsync(async (req, res) => {
  const imageUrl = req.file ? req.file.location : null;
  await categoryService.addCategoryService(req.body, imageUrl);
  res.redirect('/admin/category');
});

export const editCategory = catchAsync(async (req, res) => {
  const categoryId = req.params.id;
  const imageUrl = req.file ? req.file.location : null;
  await categoryService.editCategory(categoryId, req.body, imageUrl);
  res.redirect('/admin/category');
});

export const deleteCategory = catchAsync(async (req, res) => {
  const id = req.params.id;
  await categoryService.deleteCategory(id);
  res.redirect('/admin/category');
});