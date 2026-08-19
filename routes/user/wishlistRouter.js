import express from 'express';
import * as wishlistController from '../../controllers/user/wishlistController.js';
import { isUserAuthenticated } from '../../middlewares/auth.js';

const router = express.Router();

router.use(isUserAuthenticated); // logged-in users only, same as cart

router.get('/', wishlistController.getWishlist);
router.post('/', wishlistController.addToWishlist);
router.delete('/:productId', wishlistController.removeFromWishlist);

export default router;