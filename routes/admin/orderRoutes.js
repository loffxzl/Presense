import express from 'express';
import * as orderController from '../../controllers/admin/orderController.js';

import { isAdminAuthenticated } from '../../middlewares/auth.js';

const router = express.Router();

router.get('/', isAdminAuthenticated, orderController.listOrders);
router.get('/:id', isAdminAuthenticated, orderController.getOrderDetails);
router.patch('/:id/status', isAdminAuthenticated, orderController.updateStatus);

export default router;

