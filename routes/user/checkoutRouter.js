import express from 'express';
import * as checkoutController from '../../controllers/user/checkoutController.js';
import { isUserAuthenticated } from '../../middlewares/auth.js';

const router = express.Router();
router.use(isUserAuthenticated);

router.get('/', checkoutController.getCheckoutPage);
router.post('/apply-coupon', checkoutController.applyCoupon);
router.post('/place-order', checkoutController.placeOrder);

export default router;