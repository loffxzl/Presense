// routes/user/walletRoutes.js
import express from 'express';
import * as walletController from '../../controllers/user/walletController.js';
import { isUserAuthenticated } from '../../middlewares/auth.js';

const router = express.Router();

router.use(isUserAuthenticated);

router.get('/', walletController.showWallet);
router.get('/balance', walletController.getBalance);
router.post('/checkout', walletController.checkoutWithWallet);
router.post('/topup/create', walletController.createTopup);
router.post('/topup/verify', walletController.verifyTopup);

export default router;

