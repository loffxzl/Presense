import express from 'express';
import { isUserAuthenticated } from '../middlewares/auth.js';
import * as profileController from '../controllers/user/profileController.js'

const router = express.Router();

router.get('/', (req, res) => {
  res.render('user/landing', { title: 'Presense' });
});

router.get('/home', isUserAuthenticated, (req, res) => {
  res.render('user/home', { title: 'Home' });
});

router.get('/profile',isUserAuthenticated,profileController.getProfilePage)
router.post('/profile/update',isUserAuthenticated,profileController.updateProfile);
router.post('/profile/change-password',isUserAuthenticated,profileController.changePassword);

export default router;