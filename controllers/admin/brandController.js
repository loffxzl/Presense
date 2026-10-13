import { catchAsync } from '../../utils/catchAsync.js';
import * as brandService from '../../services/admin/brandService.js';

export const listBrands = catchAsync(async (req, res) => {
    const { page = 1, search = '' } = req.query;
    const data = await brandService.listBrands({ page, limit: 10, search });
    res.render('admin/brand', { ...data, title: 'Brand Management' });
});

export const createBrand = catchAsync(async (req, res) => {
    const brand = await brandService.createBrand(req.body);
    res.status(201).json({ success: true, brand });
});

export const updateBrand = catchAsync(async (req, res) => {
    const brand = await brandService.updateBrand(req.params.id, req.body);
    res.status(200).json({ success: true, brand });
});

export const deleteBrand = catchAsync(async (req, res) => {
    await brandService.deleteBrand(req.params.id);
    res.status(200).json({ success: true });
});