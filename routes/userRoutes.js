import express from 'express';
import { isUserAuthenticated } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.render('user/landing', { title: 'Presense' });
});

router.get('/home', isUserAuthenticated, (req, res) => {
  res.render('user/home', { title: 'Home' });
});

export default router;