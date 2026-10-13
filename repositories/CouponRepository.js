import Coupon from '../models/Coupon.js'

export const findCoupon = async (filter,sort,skip,limit) =>{
    return await Coupon.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

export const createCoupon = async (data) => {
    return await Coupon.create(data);
};

export const editCoupon = async (id, data) => {
    return await Coupon.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

export const deleteCoupon = async (id) => {
    return await Coupon.findByIdAndUpdate(id, { $set: { isDeleted: true } }, { new: true });
};

export const totalCoupons = async (filter) => {
    return await Coupon.countDocuments(filter);
}


export const findCouponByCode = async (code) => {
    return await Coupon.findOne({ code, isDeleted: { $ne: true } });
};

export const findCouponById = async (id) => {
    return await Coupon.findById(id);
};

// Atomic — avoids a read-then-write race if two requests redeem the same
// coupon at nearly the same instant.
export const incrementUsage = async (code) => {
    return await Coupon.updateOne({ code }, { $inc: { usedCount: 1 } });
};

// Coupons that are structurally eligible for a cart of this subtotal — active,
// not expired, minimum order met, and global usage limit not exhausted.
// Per-user usage still needs to be checked separately (that requires querying
// Orders, which this repository has no business knowing about).
export const findEligibleCoupons = async (subtotal) => {
    return await Coupon.find({
        isDeleted: { $ne: true },
        isActive: true,
        expiryDate: { $gt: new Date() },
        minOrderAmount: { $lte: subtotal },
        $or: [
            { usageLimit: 0 },
            { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
        ]
    }).sort({ discountValue: -1 });
};