import * as brandRepository from '../../repositories/brandRepository.js';
import AppError from '../../utils/AppError.js';

export const listBrands = async ({ page = 1, limit = 10, search = '' } = {}) => {
    const filter = {};
    if (search.trim()) {
        filter.name = new RegExp(search.trim(), 'i');
    }

    const currentPage = Math.max(1, parseInt(page));
    const skip = (currentPage - 1) * limit;

    const [brands, totalBrands] = await Promise.all([
        brandRepository.findBrands({ filter, skip, limit }),
        brandRepository.countBrands(filter)
    ]);

    return {
        brands,
        currentPage,
        totalPages: Math.ceil(totalBrands / limit) || 1,
        totalBrands,
        search
    };
};


export const getActiveBrands = async () => {
    return await brandRepository.findAllActiveBrands();
};

export const createBrand = async (data) => {
    const name = (data.name || '').trim();
    if (!name) throw new AppError('Brand name is required', 400);

    const duplicate = await brandRepository.findBrands({
        filter: { name: new RegExp(`^${name}$`, 'i') },
        limit: 1
    });
    if (duplicate.length > 0) throw new AppError('A brand with this name already exists', 409);

    return await brandRepository.createBrand({
        name,
        description: (data.description || '').trim(),
        status: data.status || 'active'
    });
};

export const updateBrand = async (id, data) => {
    const brand = await brandRepository.findBrandById(id);
    if (!brand) throw new AppError('Brand not found', 404);

    const name = (data.name || '').trim();
    if (name && name.toLowerCase() !== brand.name.toLowerCase()) {
        const duplicate = await brandRepository.findBrands({
            filter: { name: new RegExp(`^${name}$`, 'i') },
            limit: 1
        });
        if (duplicate.length > 0) throw new AppError('A brand with this name already exists', 409);
    }

    return await brandRepository.updateBrand(id, {
        ...(name && { name }),
        ...(data.description !== undefined && { description: data.description.trim() }),
        ...(data.status && { status: data.status })
    });
};

export const deleteBrand = async (id) => {
    const inUse = await brandRepository.countProductsUsingBrand(id);
    if (inUse > 0) {
        throw new AppError(`Cannot delete — ${inUse} product(s) still use this brand`, 409);
    }

    const deleted = await brandRepository.deleteBrand(id);
    if (!deleted) throw new AppError('Brand not found', 404);
    return deleted;
};