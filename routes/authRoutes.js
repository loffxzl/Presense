import express from 'express';
import * as authController from '../controllers/admin/authControler.js';

const router = express.Router();

router.get('/login', authController.getLoginPage);
router.post('/login', authController.postLogin);
router.get('/logout', authController.logout);

export default router;