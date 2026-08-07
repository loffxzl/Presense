import express from 'express';
import * as cartController from '../../controllers/user/cartController.js';
import { isUserAuthenticated } from '../../middlewares/auth.js';

const router = express.Router();

router.use(isUserAuthenticated); // logged-in users only, per your requirement

router.get('/', cartController.getCart);
router.post('/', cartController.addToCart);
router.patch('/:productId/:variantId', cartController.updateQuantity);
router.delete('/:productId/:variantId', cartController.removeFromCart);
router.delete('/', cartController.clearCart);

export default router;