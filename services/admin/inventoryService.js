import * as inventoryRepository from '../../repositories/inventoryRepository.js';
import AppError from '../../utils/AppError.js';

const LOW_STOCK_THRESHOLD = 5; // matches the "Only N left in stock" convention on the product detail page

export const listInventory = async ({ page = 1, limit = 10, search = '', lowStockOnly = false } = {}) => {
    const currentPage = Math.max(1, parseInt(page));
    const skip = (currentPage - 1) * limit;
    const options = { search, lowStockOnly: lowStockOnly === 'true' || lowStockOnly === true, lowStockThreshold: LOW_STOCK_THRESHOLD, skip, limit };

    const [variants, totalVariants] = await Promise.all([
        inventoryRepository.getVariantInventory(options),
        inventoryRepository.countVariantInventory(options)
    ]);

    return {
        variants,
        currentPage,
        totalPages: Math.ceil(totalVariants / limit) || 1,
        totalVariants,
        search,
        lowStockOnly: options.lowStockOnly,
        lowStockThreshold: LOW_STOCK_THRESHOLD
    };
};

export const adjustStock = async (productId, variantId, { delta, note = '', adminId = null } = {}) => {
    const numericDelta = Number(delta);
    if (!numericDelta || Number.isNaN(numericDelta)) {
        throw new AppError('Provide a non-zero quantity to adjust', 400);
    }

    const updated = await inventoryRepository.adjustVariantStock(productId, variantId, numericDelta);
    if (!updated) {
        const product = await inventoryRepository.findProductById(productId);
        if (!product || !product.varients.id(variantId)) {
            throw new AppError('Product variant not found', 404);
        }
        throw new AppError('Not enough stock to reduce by this amount', 409);
    }

    const variant = updated.varients.id(variantId);
    const newStock = variant.stock;
    const previousStock = newStock - numericDelta;

    await inventoryRepository.createStockLog({
        productId,
        variantId,
        size: variant.size,
        type: 'adjustment',
        quantityChange: numericDelta,
        previousStock,
        newStock,
        note: note.trim(),
        performedBy: adminId
    });

    return { product: updated, variant };
};

export const getStockLogs = async ({ productId, variantId, page = 1, limit = 20 } = {}) => {
    const filter = {};
    if (productId) filter.productId = productId;
    if (variantId) filter.variantId = variantId;

    const currentPage = Math.max(1, parseInt(page));
    const skip = (currentPage - 1) * limit;

    const [logs, totalLogs] = await Promise.all([
        inventoryRepository.findStockLogs({ filter, skip, limit }),
        inventoryRepository.countStockLogs(filter)
    ]);

    return { logs, currentPage, totalPages: Math.ceil(totalLogs / limit) || 1, totalLogs };
};