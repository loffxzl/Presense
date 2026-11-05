import express from 'express';
import passport from 'passport';
import * as authController from '../controllers/auth/authController.js';

const router = express.Router();
const { guestOnly } = authController;


router.get('/login', guestOnly, authController.getLoginPage);
router.post('/login', guestOnly, authController.postLogin);
router.get('/signup', guestOnly, authController.getSignupPage);
router.post('/signup', guestOnly, authController.postSignup);
router.get('/forgot-password', guestOnly, authController.getForgotPasswordPage);
router.post('/forgot-password', guestOnly, authController.postForgotPassword);

router.get('/google', guestOnly, (req, res, next) => {
  const ref = String(req.query.ref || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    ...(ref ? { state: `ref:${ref}` } : {})
  })(req, res, next);
});


router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login', session: false }),
  authController.googleCallback
);


router.get('/verify-otp', authController.getVerifyOTPPage);
router.post('/verify-otp', authController.postVerifyOTP);
router.post('/resend-otp', authController.resendOTP);
router.get('/reset-password/:token', authController.getResetPasswordPage);
router.post('/reset-password/:token', authController.postResetPassword);
router.get('/logout', authController.logout);
router.get('/admin/logout', authController.adminLogout);

export default router;