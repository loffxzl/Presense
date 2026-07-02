import * as authService from '../../services/authService.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.js';
import * as userRepository from '../../repositories/userRepository.js';
import { success } from 'zod';

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge
});

export const getLoginPage = (req, res) => {
  if (req.session.admin) return res.redirect('/admin/users');
  if (req.cookies.accessToken) return res.redirect('/home');
  res.render('auth/login', { title: 'Login', error: null });
};

export const postLogin = async (req, res) => {
  try {
    const result = await authService.loginUser(req.body);

    if (result.role === 'admin') {
      req.session.admin = { id: result.user._id, email: result.user.email, name: result.user.name };
      return res.redirect('/admin/users');
    }

    res.cookie('accessToken', result.accessToken, cookieOptions(15 * 60 * 1000));
    res.cookie('refreshToken', result.refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));
    res.redirect('/home');

  } catch (err) {
    if (err.message === 'EMAIL_NOT_VERIFIED') {
      req.session.pendingEmail = req.body.email.toLowerCase().trim();
      return res.redirect('/auth/verify-otp');
    }
    res.render('auth/login', { title: 'Login', error: err.message });
  }
};

export const getSignupPage = (req, res) => {
  res.render('auth/signup', { title: 'Sign Up', error: null });
};

export const postSignup = async (req, res) => {
  try {
    await authService.signupUser(req.body);
    req.session.pendingEmail = req.body.email.toLowerCase().trim();
    res.redirect('/auth/verify-otp');
  } catch (err) {
    res.render('auth/signup', { title: 'Sign Up', error: err.message });
  }
};

export const getVerifyOTPPage = (req, res) => {
  if (!req.session.pendingEmail) return res.redirect('/auth/signup');
  res.render('auth/verifyOtp', { title: 'Verify OTP', error: null, message: null, email: req.session.pendingEmail });
};

export const postVerifyOTP = async (req, res) => {
  try {
    const email = req.session.pendingEmail;
    if (!email) return res.redirect('/auth/signup');

    const { accessToken, refreshToken } = await authService.verifyOTP(email, req.body.otp);

    req.session.pendingEmail = null;
    res.cookie('accessToken', accessToken, cookieOptions(15 * 60 * 1000));
    res.cookie('refreshToken', refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));
    res.redirect('/home');

  } catch (err) {
    res.render('auth/verifyOtp', {
      title: 'Verify OTP',
      error: err.message,
      message: null,
      email: req.session.pendingEmail
    });
  }
};

export const resendOTP = async (req, res) => {
  try {
    const email = req.session.pendingEmail;
    if (!email) return res.redirect('/auth/signup');
    await authService.resendOTP(email);
    res.render('auth/verifyOtp', { title: 'Verify OTP', error: null, message: 'OTP resent successfully', email });
  } catch (err) {
    res.render('auth/verifyOtp', { title: 'Verify OTP', error: err.message, message: null, email: req.session.pendingEmail });
  }
};

export const logout = (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err.message);
    res.redirect('/auth/login');
  });
};

export const googleCallback = async (req, res) => {
  try {
    const accessToken = generateAccessToken({ id: req.user._id, role: req.user.role });
    const refreshToken = generateRefreshToken({ id: req.user._id, role: req.user.role });

    await userRepository.updateUserById(req.user._id, { refreshToken });

    res.cookie('accessToken', accessToken, cookieOptions(15 * 60 * 1000));
    res.cookie('refreshToken', refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000));

    res.redirect('/home');
  } catch (err) {
    console.error('Google callback error:', err.message);
    res.redirect('/auth/login');
  }
};

export const getForgotPasswordPage = (req,res) => {
  res.render('auth/forgotPassword', {title:'forgot password', error:null , success:null })
};

export const postForgotPassword = async (req, res) => {
  try {
    await authService.forgotPassword(req.body.email);
    res.render('auth/forgotPassword', {
      title: 'Forgot Password',
      error: null,
      success: 'Reset link sent to your email'
    });
  } catch (err) {
    res.render('auth/forgotPassword', { title: 'Forgot Password', error: err.message, success: null });
  }
};
export const getResetPasswordPage = (req,res) => {

    res.render('auth/resetPassword', {
      title:'Reset Password',
      error:null,
      token:req.params.token
    });
  
}

export const postResetPassword = async (req, res) => {
  try {
    await authService.resetPassword(req.params.token, req.body);
    res.render('auth/resetPassword', {
      title: 'Reset Password',
      error: null,
      success: 'Password reset successfully. You can now login.',
      token: null
    });
  } catch (err) {
    res.render('auth/resetPassword', {
      title: 'Reset Password',
      error: err.message,
      success: null,
      token: req.params.token
    });
  }
};