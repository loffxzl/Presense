import express from 'express';
import * as couponController from '../../controllers/admin/couponController.js';
import { isAdminAuthenticated } from '../../middlewares/auth.js';

const router = express.Router();

router.get('/', isAdminAuthenticated, couponController.getCouponList);
router.post('/', isAdminAuthenticated, couponController.addCoupon);
router.patch('/:id', isAdminAuthenticated, couponController.editCoupon);
router.delete('/:id',isAdminAuthenticated, couponController.deleteCoupon);

export default router;