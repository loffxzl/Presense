import { z } from 'zod';

export const couponSchema = z.object({
  code: z.string().trim().min(3, 'Code must be at least 3 characters').max(20, 'Code must be under 20 characters')
    .regex(/^[A-Za-z0-9]+$/, 'Code can only contain letters and numbers'),

  description: z.string().trim().max(200, 'Description must be under 200 characters').optional().or(z.literal('')),

  discountType: z.enum(['percentage', 'flat'], {
    errorMap: () => ({ message: 'Please select a discount type' })
  }),

  discountValue: z.coerce.number().positive('Discount value must be greater than 0'),

  maxDiscountAmount: z.coerce.number().positive().optional(),

  minOrderAmount: z.coerce.number().min(0, 'Minimum order amount cannot be negative').optional().default(0),

  expiryDate: z.coerce.date({ errorMap: () => ({ message: 'A valid expiry date is required' }) }),

  usageLimit: z.coerce.number().int().min(0, 'Usage limit cannot be negative').optional().default(0),
  usageLimitPerUser: z.coerce.number().int().min(0, 'Per-user limit cannot be negative').optional().default(1),

  isActive: z.coerce.boolean().optional().default(true)
}).refine(
  (data) => data.discountType !== 'percentage' || data.discountValue <= 100,
  { message: 'Percentage discount cannot exceed 100%', path: ['discountValue'] }
).refine(
  (data) => data.expiryDate > new Date(),
  { message: 'Expiry date must be in the future', path: ['expiryDate'] }
);