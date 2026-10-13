import * as userRepository from '../../repositories/userRepository.js';
import { z } from 'zod';
import AppError from '../../utils/AppError.js';

const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  line1: z.string().trim().min(3, 'Address line 1 is required'),
  line2: z.string().trim().optional().or(z.literal('')),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  country: z.string().trim().min(2, 'Country is required'),
  isDefault: z.coerce.boolean().optional()
});


export const getAddresses = async (userId) => {
  const user = await userRepository.findUserById(userId);
  if (!user) throw new AppError('User not found', 404);
  return user.addresses;
};

export const addAddress = async (userId, data) => {
  const parsed = addressSchema.safeParse(data);
  if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);

  const user = await userRepository.findUserById(userId);
  if (!user) throw new AppError('User not found', 404);

  const addressData = { ...parsed.data };

  if (!user.addresses || user.addresses.length === 0) {
    addressData.isDefault = true; // first address is always default
  }

  return userRepository.addAddress(userId, addressData);
};

export const updateAddress = async (userId, addressId, data) => {
  const parsed = addressSchema.safeParse(data);
  if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);

  const user = await userRepository.findUserById(userId);
  if (!user) throw new AppError('User not found', 404);

  const existing = user.addresses.find((a) => a._id.toString() === addressId.toString());
  if (!existing) throw new AppError('Address not found', 404);

  if (parsed.data.isDefault) {
    // Becoming the default — clear everyone else's flag first.
    await userRepository.unsetAllDefaults(userId);
  } else if (existing.isDefault) {
    // This address WAS the default and is being unset — promote another
    // address instead of leaving the user with zero defaults.
    const others = user.addresses.filter((a) => a._id.toString() !== addressId.toString());
    if (others.length > 0) {
      await userRepository.setDefaultAddress(userId, others[0]._id);
    } else {
      // No other address exists — a lone address can't be "not default".
      parsed.data.isDefault = true;
    }
  }

  return userRepository.updateAddress(userId, addressId, parsed.data);
};

export const deleteAddress = async (userId, addressId) => {
  const user = await userRepository.findUserById(userId);
  if (!user) throw new AppError('User not found', 404);

  const address = user.addresses.find((a) => a._id.toString() === addressId.toString());
  if (!address) throw new AppError('Address not found', 404);

  const wasDefault = address.isDefault;
  const updatedUser = await userRepository.deleteAddress(userId, addressId);

  if (wasDefault && updatedUser.addresses.length > 0) {
    await userRepository.setDefaultAddress(userId, updatedUser.addresses[0]._id);
  }

  return updatedUser;
};

export const setDefaultAddress = async (userId, addressId) => {
  const user = await userRepository.findUserById(userId);
  if (!user) throw new AppError('User not found', 404);

  const exists = user.addresses.some((a) => a._id.toString() === addressId.toString());
  if (!exists) throw new AppError('Address not found', 404);

  return userRepository.setDefaultAddress(userId, addressId);
};