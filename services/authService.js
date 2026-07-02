import bcrypt from 'bcrypt';
import * as userRepository from '../repositories/userRepository.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { sendOTPEmail, sendResetEmail } from '../utils/email.js';
import { signupSchema, loginSchema, otpSchema } from '../validators/authValidators.js';
import crypto from 'crypto';

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const signupUser = async (data) => {
  const parsed = signupSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }
  const { fullname, email, password } = parsed.data;

  const existing = await userRepository.findUserByEmail(email);
  if (existing) {
    if (!existing.isEmailVerified) {
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await userRepository.updateUserById(existing._id, {
        emailVerificationToken: otp,
        emailVerificationExpiry: otpExpiry
      });
      await sendOTPEmail(email, otp);
      return existing;
    }
    throw new Error('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  const user = await userRepository.createUser({
    name: fullname,
    email,
    passwordHash,
    emailVerificationToken: otp,
    emailVerificationExpiry: otpExpiry,
    isEmailVerified: false,
    role: 'user',
    status: 'active'
  });

  await sendOTPEmail(email, otp);
  return user;
};

export const verifyOTP = async (email, otp) => {
  const user = await userRepository.findUserByEmail(email);
  if (!user) throw new Error('User not found');
  if (user.emailVerificationToken !== otp) throw new Error('Invalid OTP');
  if (user.emailVerificationExpiry < new Date()) throw new Error('OTP expired. Please resend.');

  const accessToken = generateAccessToken({ id: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id, role: user.role });

  await userRepository.updateUserById(user._id, {
    isEmailVerified: true,
    emailVerificationToken: undefined,
    emailVerificationExpiry: undefined,
    refreshToken
  });

  return { accessToken, refreshToken };
};

export const resendOTP = async (email) => {
  const user = await userRepository.findUserByEmail(email);
  if (!user) throw new Error('User not found');

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  await userRepository.updateUserById(user._id, {
    emailVerificationToken: otp,
    emailVerificationExpiry: otpExpiry
  });

  await sendOTPEmail(email, otp);
};

export const loginUser = async (data) => {
  const parsed = loginSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }
  const { email, password } = parsed.data;

  const user = await userRepository.findUserByEmail(email);
  if (!user) throw new Error('Invalid credentials');
  if (!user.isEmailVerified) throw new Error('EMAIL_NOT_VERIFIED');
  if (user.status === 'blocked') throw new Error('Your account has been blocked');

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw new Error('Invalid credentials');

  if (user.role === 'admin') {
    return { role: 'admin', user };
  }

  const accessToken = generateAccessToken({ id: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id, role: user.role });

  await userRepository.updateUserById(user._id, { refreshToken });

  return { role: 'user', accessToken, refreshToken, user };
};

export const forgotPassword = async (email) => {
  const user = await userRepository.findUserByEmail(email.toLowerCase().trim());
  if(!user) throw new Error(' No account found with the email');

  if(user.passwordHash === 'google-oauth'){
    throw new Error('this acount uses Google dign-in. Password reeset not available');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 30 * 60 * 1000) //30 mins

  await userRepository.updateUserById(user._id, {
    emailVerificationToken:token,
    emailVerificationExpiry:expiry
  });

  const resetLink = `${process.env.BASE_URL}/auth/reset-password/${token}`;
  await sendResetEmail(user.email, resetLink);
};

export const resetPassword = async (token, {newPassword, confirmNewPassword}) => {
  if(!newPassword || newPassword.length < 8){
    throw new Error('Password must be 8 characters');
  }

  if(newPassword !== confirmNewPassword){
    throw new Error('Password do not match');
  }

  const user = await userRepository.findUserByResetToken(token);
  if(!user) throw new Error('invalid or expired reset link');
   
  if(user.emailVerificationExpiry < new Date()) throw new Error('Reset link has expired');

  const passwordHash = await bcrypt.hash(newPassword,10);
  await userRepository.updateUserById(user._id, {
    passwordHash,
    emailVerificationToken:undefined,
    emailVerificationExpiry:undefined
  });

};



