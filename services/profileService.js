import bcrypt from 'bcrypt';
import * as userRespository from '../repositories/userRepository.js';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits').optional().or(z.literal(''))
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmNewPassword: z.string()
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match',
  path: ['confirmNewPassword']
});

export const updateProfile = async (id, data) => {
    const parsed = updateProfileSchema.safeParse(data)
    if(!parsed.success) throw new Error(parsed.error.issues[0].message);

    const { name , phone } = parsed.data;
    return userRespository.updateUserById(id, { name, phone});
};

export const changePassword = async (id, data) => {
    const parsed = changePasswordSchema.safeParse(data);
    if(!parsed.success) throw new Error(parsed.error.issues[0].message);

    const { currentPassword, newPassword} = parsed.data;

    const user = await userRespository.findUserById(id);
    if(!user) throw new Error('User not found');

    if(user.passwordHash === 'google-oauth'){
        throw new Error('Google accounts cannot change password here');
    };

    const isMatch = await bcrypt.compare(currentPassword,user.passwordHash);
    if(!isMatch) throw new Error('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword,10);
    await userRespository.updateUserById(id, {passwordHash});
};