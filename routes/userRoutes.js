import express from 'express';
import { isUserAuthenticated, attachUser } from '../middlewares/auth.js';
import * as profileController from '../controllers/user/profileController.js';
import * as addressController from '../controllers/user/addressController.js';
import * as emailController from '../controllers/user/emailController.js';
import { uploadAvatar } from '../config/multer.js';

const router = express.Router();


router.get('/', attachUser, (req, res) => {
  if (res.locals.user) return res.redirect('/home');
  res.render('user/landing', { title: 'Presense' });
});


router.get('/home', isUserAuthenticated, (req, res) => {
  res.render('user/home', { title: 'Home' });
});


router.get('/profile', isUserAuthenticated, profileController.getProfilePage);
router.patch('/profile/update', isUserAuthenticated, profileController.updateProfile);
router.patch('/profile/change-password', isUserAuthenticated, profileController.changePassword);


router.get('/profile/addresses', isUserAuthenticated, addressController.getAddressesPage);
router.post('/profile/addresses', isUserAuthenticated, addressController.addAddress);
router.put('/profile/addresses/:id', isUserAuthenticated, addressController.updateAddress);
router.delete('/profile/addresses/:id', isUserAuthenticated, addressController.deleteAddress);
router.patch('/profile/addresses/:id/default', isUserAuthenticated, addressController.setDefaultAddress);

router.get('/profile/change-email', isUserAuthenticated, emailController.getChangeEmailPage);
router.post('/profile/change-email', isUserAuthenticated, emailController.postChangeEmail);
router.get('/profile/verify-email-change', isUserAuthenticated, emailController.getVerifyEmailChangePage);
router.post('/profile/verify-email-change', isUserAuthenticated, emailController.postVerifyEmailChange);

router.patch('/profile/avatar', isUserAuthenticated, uploadAvatar.single('avatar'), profileController.updateAvatar);

export default router;