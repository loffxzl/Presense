import { z } from 'zod';

// --- Variant ---
const variantSchema = z.object({
  size: z.string().trim().min(1, 'Size is required'),
  stock: z.coerce.number().int('Stock must be a whole number').min(0, 'Stock cannot be negative').default(0),
  basePrice: z.coerce.number().positive('Base price must be greater than 0'),
  salePrice: z.coerce.number().positive('Sale price must be greater than 0')
}).refine((data) => data.salePrice <= data.basePrice, {
  message: 'Sale price cannot be higher than base price',
  path: ['salePrice']
});

// --- Offer ---
const offerSchema = z.object({
  label: z.string().trim().min(1, 'Offer label is required'),
  discountPercent: z.coerce.number().min(1, 'Discount must be at least 1%').max(100, 'Discount cannot exceed 100%'),
  isActive: z.coerce.boolean(),
  expiryDate: z.coerce.date({ errorMap: () => ({ message: 'A valid expiry date is required' }) })
}).refine((data) => data.expiryDate > new Date(), {
  message: 'Expiry date must be in the future',
  path: ['expiryDate']
});

// --- Product ---
export const productSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),

  description: z.string().trim().optional().or(z.literal('')),

  brand: z.string().trim().min(1, 'Brand is required'),

  categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category'),

  concentration: z.enum(['Eau de Parfum', 'Extrait de Parfum', 'Eau de Toilette'], {
    errorMap: () => ({ message: 'Please select a valid concentration' })
  }),

  status: z.enum(['active', 'unlisted']).optional(),

  // At least one variant is required — a product with zero variants is unsellable
  varients: z.array(variantSchema).min(1, 'At least one variant is required'),

  // Offers are optional — a product can have zero offers
  offer: z.array(offerSchema).optional().default([])
});