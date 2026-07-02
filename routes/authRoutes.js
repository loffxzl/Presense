import express from 'express';
import passport from 'passport';
import * as authController from '../controllers/auth/authController.js';

const router = express.Router();

router.get('/login', authController.getLoginPage);
router.post('/login', authController.postLogin);
router.get('/signup', authController.getSignupPage);
router.post('/signup', authController.postSignup);
router.get('/verify-otp', authController.getVerifyOTPPage);
router.post('/verify-otp', authController.postVerifyOTP);
router.post('/resend-otp', authController.resendOTP);
router.get('/logout', authController.logout);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login', session: false }),
  authController.googleCallback
);

router.get('/forgot-password', authController.getForgotPasswordPage);
router.post('/forgot-password', authController.postForgotPassword);
router.get('/reset-password/:token', authController.getResetPasswordPage);
router.post('/reset-password/:token', authController.postResetPassword);

export default router;