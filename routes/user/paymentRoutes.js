// routes/user/paymentRoutes.js
import express from 'express';
import * as paymentController from '../../controllers/user/paymentController.js';
import { isUserAuthenticated } from '../../middlewares/auth.js';

const router = express.Router();

router.use(isUserAuthenticated); 

router.post('/checkout', paymentController.startCheckout);
router.post('/orders/:id/create', paymentController.createPaymentOrder);
router.post('/orders/:id/verify', paymentController.verifyPayment);
router.post('/orders/:id/abandon', paymentController.abandonPayment);

export default router;