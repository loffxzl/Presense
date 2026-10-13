import express from 'express';
import * as orderController from '../../controllers/user/orderController.js';
import { isUserAuthenticated } from '../../middlewares/auth.js';

const router = express.Router();
router.use(isUserAuthenticated);

router.get('/', orderController.listOrders);
router.get('/:id/success', orderController.getOrderSuccess);
router.get('/:id/invoice', orderController.downloadInvoice);
router.get('/:id', orderController.getOrderDetails);
router.post('/:id/cancel', orderController.cancelOrder);
router.post('/:id/items/:productId/:variantId/cancel', orderController.cancelOrderItem);
router.post('/:id/return', orderController.requestReturn);

export default router;