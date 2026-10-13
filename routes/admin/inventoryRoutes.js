import express from 'express';
import * as inventoryController from '../../controllers/admin/inventoryController.js';
import { isAdminAuthenticated } from '../../middlewares/auth.js';

const router = express.Router();

router.get('/', isAdminAuthenticated, inventoryController.listInventory);
router.patch('/:productId/:variantId', isAdminAuthenticated, inventoryController.adjustStock);
router.get('/:productId/:variantId/logs', isAdminAuthenticated, inventoryController.getStockLogs);

export default router;

