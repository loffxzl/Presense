import * as userRepository from '../repositories/userRepository.js';
import { sendOTPEmail } from '../utils/email.js';
import { z } from 'zod';

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const emailSchema = z.string().trim().toLowerCase().email('Invalid email address');

export const initiateEmailChange = async (userId, newEmail) => {
  const parsed = emailSchema.safeParse(newEmail);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const email = parsed.data;

  const existing = await userRepository.findUserByEmail(email);
  if (existing) throw new Error('Email already in use');

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 1 * 60 * 1000); // 1 minute

  await userRepository.updateUserById(userId, {
    emailVerificationToken: otp,
    emailVerificationExpiry: otpExpiry
  });

  await sendOTPEmail(email, otp);
};

export const verifyEmailChange = async (userId, newEmail, otp) => {
  const user = await userRepository.findUserById(userId);
  if (!user) throw new Error('User not found');
  if (user.emailVerificationToken !== otp) throw new Error('Invalid OTP');
  if (user.emailVerificationExpiry < new Date()) throw new Error('OTP expired');

  await userRepository.updateUserById(userId, {
    email: newEmail,
    emailVerificationToken: undefined,
    emailVerificationExpiry: undefined
  });
};