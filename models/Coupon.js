import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, uppercase: true, trim: true },
  description: { type: String, trim: true },

  discountType: { type: String, enum: ['percentage', 'flat'], required: true },
  discountValue: { type: Number, required: true, min: 0 },

  // Only meaningful for percentage discounts — caps how much a single
  // order can be discounted by, so e.g. "20% off" doesn't wipe out a
  // huge order entirely. Ignored for flat discounts.
  maxDiscountAmount: { type: Number, min: 0 },

  minOrderAmount: { type: Number, default: 0, min: 0 },

  expiryDate: { type: Date, required: true },

  // 0 = unlimited
  usageLimit: { type: Number, default: 0, min: 0 },
  usageLimitPerUser: { type: Number, default: 1, min: 0 },
  usedCount: { type: Number, default: 0, min: 0 },

  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// Same soft-delete-aware uniqueness pattern used for Category/Product —
// a deleted coupon's code can be reused for a brand new coupon later.
couponSchema.index(
  { code: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } }
);

export default mongoose.model('Coupon', couponSchema);