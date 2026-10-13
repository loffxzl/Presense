import express from 'express';
import * as checkoutAddressController from '../../controllers/user/checkoutAddressController.js';
import { isUserAuthenticated } from '../../middlewares/auth.js';

const router = express.Router();
router.use(isUserAuthenticated);

router.get('/', checkoutAddressController.getAddresses);
router.post('/', checkoutAddressController.addAddress);
router.patch('/:id', checkoutAddressController.editAddress);
router.delete('/:id', checkoutAddressController.deleteAddress);
router.patch('/:id/default', checkoutAddressController.setDefaultAddress);

export default router;
