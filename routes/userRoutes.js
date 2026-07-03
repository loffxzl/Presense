import express from 'express';
import { isUserAuthenticated, attachUser } from '../middlewares/auth.js';
import * as profileController from '../controllers/user/profileController.js'
import * as addressController from '../controllers/user/addressController.js'

const router = express.Router();

router.get('/', attachUser, (req, res) => {
  if (res.locals.user) return res.redirect('/home');
  res.render('user/landing', { title: 'Presense' });
});

router.get('/home', isUserAuthenticated, (req, res) => {
  res.render('user/home', { title: 'Home' });
});

router.get('/profile',isUserAuthenticated,profileController.getProfilePage)
router.post('/profile/update',isUserAuthenticated,profileController.updateProfile);
router.post('/profile/change-password',isUserAuthenticated,profileController.changePassword);

router.get('/profile/addresses', isUserAuthenticated, addressController.getAddressesPage);
router.post('/profile/addresses', isUserAuthenticated, addressController.addAddress);
router.post('/profile/addresses/:id', isUserAuthenticated, addressController.updateAddress);
router.post('/profile/addresses/:id/delete', isUserAuthenticated, addressController.deleteAddress);
router.post('/profile/addresses/:id/default', isUserAuthenticated, addressController.setDefaultAddress);

export default router;

//update with http methods