// routes/admin/walletRoutes.js
import express from 'express';
import * as walletController from '../../controllers/admin/walletController.js';
import { isAdminAuthenticated } from '../../middlewares/auth.js';

const router = express.Router();

router.get('/', isAdminAuthenticated, walletController.listWallets);
router.get('/:userId/transactions', isAdminAuthenticated, walletController.getUserTransactions);

export default router;
