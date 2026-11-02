// ONE place that decides what a customer pays for a variant.
// Rule: the customer gets the HIGHER of the product offer and the category
// offer. They are never stacked. The offer is taken off variant.salePrice
// (the same base the product page already used).
//
// Use it everywhere a price is shown or charged: listing, detail, wishlist,
// cart, checkout, order creation.

const round2 = (n) => Math.round(n * 100) / 100;

// Accepts a single offer object, an array of offers, or nothing.
// Returns the best currently-valid one as { percent, label } or null.
const bestActive = (offers, now) => {
    const list = Array.isArray(offers) ? offers : offers ? [offers] : [];
    let best = null;
    for (const o of list) {
        if (!o) continue;
        if (o.isActive === false) continue;
        if (o.expiryDate && new Date(o.expiryDate) <= now) continue;
        if (o.startDate && new Date(o.startDate) > now) continue;
        const percent = Number(o.discountPercent ?? o.percent ?? 0);
        if (!(percent > 0) || percent > 100) continue;
        if (!best || percent > best.percent) best = { percent, label: o.label || '' };
    }
    return best;
};

// product: has .offer (array)   category: has .offer (object or array)
export const getBestOffer = (product, category = null, now = new Date()) => {
    const cat = category || (product && product.categoryId && typeof product.categoryId === 'object' && product.categoryId.name !== undefined ? product.categoryId : null);
    const p = bestActive(product && product.offer, now);
    const c = bestActive(cat && cat.offer, now);

    if (!p && !c) return { percent: 0, source: null, label: '' };
    // Tie goes to the product offer (it is the more specific one).
    if (p && (!c || p.percent >= c.percent)) return { percent: p.percent, source: 'product', label: p.label };
    return { percent: c.percent, source: 'category', label: c.label };
};

export const finalPrice = (salePrice, percent) =>
    percent > 0 ? round2(salePrice - (salePrice * percent) / 100) : round2(salePrice);

// Price details for one variant.
export const priceVariant = (variant, product, category = null, now = new Date()) => {
    const offer = getBestOffer(product, category, now);
    const price = finalPrice(variant.salePrice, offer.percent);
    return {
        mrp: variant.basePrice,
        salePrice: variant.salePrice,
        price,                       // what the customer pays
        offerPercent: offer.percent,
        offerSource: offer.source,   // 'product' | 'category' | null
        offerLabel: offer.label
    };
};

// Lowest price across a product's variants (for listing cards / "from" price).
export const lowestPrice = (product, category = null, now = new Date()) => {
    const prices = (product.varients || []).map((v) => priceVariant(v, product, category, now).price);
    return prices.length ? Math.min(...prices) : 0;
};

// MongoDB expression version, for sorting/filtering by effective price inside
// an aggregation. Expects the category joined as $category (single doc).
// offerPercentExpr evaluates to the best active percent for each product.
export const offerPercentExpr = (now = new Date()) => {
    const activeMax = (field) => ({
        $max: {
            $map: {
                input: {
                    $filter: {
                        input: { $cond: [{ $isArray: field }, field, []] },
                        as: 'o',
                        cond: {
                            $and: [
                                { $ne: ['$$o.isActive', false] },
                                { $gt: [{ $ifNull: ['$$o.expiryDate', new Date('9999-12-31')] }, now] }
                            ]
                        }
                    }
                },
                as: 'o',
                in: { $ifNull: ['$$o.discountPercent', 0] }
            }
        }
    });
    return {
        $max: [0, { $ifNull: [activeMax('$offer'), 0] }, { $ifNull: [activeMax('$category.offer'), 0] }]
    };
};