import * as homeRepository from '../../repositories/homeRepository.js';
import { getBestOffer, priceVariant } from '../../utils/pricing.js';

const ARRIVALS = 8;
const BEST_SELLERS = 4;
const MAX_BANNERS = 4;

const categoryUsable = (c) => c && c.status === 'active' && !c.isDeleted;

// One product -> the plain object the product-card partial renders.
// The price shown is exactly what pricing.js says the customer pays.
const toCard = (product, now) => {
    const category = categoryUsable(product.categoryId) ? product.categoryId : null;
    if (!category) return null; // hidden category -> hidden product

    const variants = (product.varients || []).map((v) => ({ v, p: priceVariant(v, product, category, now) }));
    if (!variants.length) return null;

    const cheapest = variants.reduce((a, b) => (b.p.price < a.p.price ? b : a));
    return {
        id: String(product._id),
        slug: product.slug,
        name: product.name,
        brand: product.brandId?.name || '',
        category: category.name,
        image: (product.image && product.image[0]) || null,
        price: cheapest.p.price,
        mrp: cheapest.p.mrp,
        offerPercent: cheapest.p.offerPercent,
        offerSource: cheapest.p.offerSource,
        hasMultipleSizes: variants.length > 1,
        inStock: variants.some(({ v }) => v.stock > 0)
    };
};

const toCards = (products, now) => products.map((p) => toCard(p, now)).filter(Boolean);

// Real offers -> hero banner slides. Nothing hardcoded: when the admin
// creates, edits or expires an offer the banner follows.
const buildOfferBanners = async (now) => {
    const [categories, products] = await Promise.all([
        homeRepository.findCategoriesWithOffers(now),
        homeRepository.findProductsWithOffers(10, now)
    ]);

    const banners = [];

    for (const c of categories) {
        const offer = getBestOffer({ offer: [] }, c, now);
        if (!offer.percent) continue;
        banners.push({
            kind: 'category',
            percent: offer.percent,
            eyebrow: offer.label || 'Collection offer',
            title: `${offer.percent}% off ${c.name}`,
            text: `Save ${offer.percent}% on every fragrance in our ${c.name} collection.`,
            href: `/products?categoryId=${c._id}`,
            cta: `Shop ${c.name}`,
            image: c.imageUrl || null,
            expiry: c.offer.expiryDate
        });
    }

    for (const p of products) {
        const category = categoryUsable(p.categoryId) ? p.categoryId : null;
        if (!category) continue;
        const offer = getBestOffer(p, category, now);
        if (offer.source !== 'product') continue; // a bigger category offer already has its banner
        banners.push({
            kind: 'product',
            percent: offer.percent,
            eyebrow: offer.label || 'Limited offer',
            title: `${offer.percent}% off ${p.name}`,
            text: p.brandId?.name ? `${p.brandId.name} — for a limited time.` : 'For a limited time.',
            href: `/products/${p.slug}`,
            cta: 'View fragrance',
            image: (p.image && p.image[0]) || null,
            expiry: (p.offer || []).find((o) => o.isActive)?.expiryDate || null
        });
    }

    return banners.sort((a, b) => b.percent - a.percent).slice(0, MAX_BANNERS);
};

const buildBestSellers = async (now) => {
    const ids = await homeRepository.findBestSellerIds(BEST_SELLERS * 2);
    if (!ids.length) return [];
    const products = await homeRepository.findProductsByIds(ids);
    const order = new Map(ids.map((id, i) => [String(id), i]));
    products.sort((a, b) => order.get(String(a._id)) - order.get(String(b._id)));
    return toCards(products, now).slice(0, BEST_SELLERS);
};

export const getHomeData = async () => {
    const now = new Date();
    const [categories, counts, arrivals, bestSellers, banners] = await Promise.all([
        homeRepository.findActiveCategories(),
        homeRepository.countProductsByCategory(),
        homeRepository.findNewArrivals(ARRIVALS * 2),
        buildBestSellers(now),
        buildOfferBanners(now)
    ]);

    return {
        categories: categories.map((c) => {
            const offer = getBestOffer({ offer: [] }, c, now);
            return {
                id: String(c._id),
                name: c.name,
                description: c.description || '',
                image: c.imageUrl || null,
                productCount: counts[String(c._id)] || 0,
                offerPercent: offer.percent
            };
        }).filter((c) => c.productCount > 0),
        arrivals: toCards(arrivals, now).slice(0, ARRIVALS),
        bestSellers,
        banners
    };
};

// Landing (logged-out) page: same real data, the view decides what to show.
export const getLandingData = getHomeData;