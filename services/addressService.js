import * as userRepository from '../repositories/userRepository.js';
import { z } from 'zod';

const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  line1: z.string().trim().min(3, 'Address line 1 is required'),
  line2: z.string().trim().optional().or(z.literal('')),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  postalCode: z.string().trim().regex(/^\d{6}$/, 'Postal code must be 6 digits'),
  country: z.string().trim().min(2, 'Country is required'),
  isDefault: z.boolean().optional()
});

export const getAddresses = async (userId) => {
  const user = await userRepository.findUserById(userId);
  if (!user) throw new Error('User not found');
  return user.addresses;
};

export const addAddress = async (userId, data) => {
  const parsed = addressSchema.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  return userRepository.addAddress(userId, parsed.data);
};

export const updateAddress = async (userId, addressId, data) => {
  const parsed = addressSchema.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  return userRepository.updateAddress(userId, addressId, parsed.data);
};

export const deleteAddress = async (userId, addressId) => {
  return userRepository.deleteAddress(userId, addressId);
};

export const setDefaultAddress = async (userId, addressId) => {
  return userRepository.setDefaultAddress(userId, addressId);
};