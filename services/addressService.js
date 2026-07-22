import * as userRepository from '../repositories/userRepository.js';
import { z } from 'zod';
import  AppError  from '../utils/AppError.js';

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
  if (!user) throw new AppError('User not found',402);
  return user.addresses;
};

export const addAddress = async (userId, data) => {
  const parsed = addressSchema.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const user = await userRepository.findUserById(userId);
  const addressData = { ...parsed.data };

  if (!user.addresses || user.addresses.length === 0) {
    addressData.isDefault = true;
  }

  return userRepository.addAddress(userId, addressData);
};

export const updateAddress = async (userId, addressId, data) => {
  const parsed = addressSchema.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  // If setting as default, unset all others first via repository
  if (parsed.data.isDefault) {
    await userRepository.unsetAllDefaults(userId);
  }

  return userRepository.updateAddress(userId, addressId, parsed.data);
};

export const deleteAddress = async (userId, addressId) => {
  const user = await userRepository.findUserById(userId);
  if (!user) throw new Error('User not found');

  const address = user.addresses.find(a => a._id.toString() === addressId.toString());
  if (!address) throw new Error('Address not found');

  const wasDefault = address.isDefault;
  const updatedUser = await userRepository.deleteAddress(userId, addressId);

  if (wasDefault && updatedUser.addresses.length > 0) {
    await userRepository.setDefaultAddress(userId, updatedUser.addresses[0]._id);
  }

  return updatedUser;
};

export const setDefaultAddress = async (userId, addressId) => {
  return userRepository.setDefaultAddress(userId, addressId);
};