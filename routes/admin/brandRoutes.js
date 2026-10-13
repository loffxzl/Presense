import express from 'express';
import * as brandController from '../../controllers/admin/brandController.js';
import { isAdminAuthenticated } from '../../middlewares/auth.js';

const router = express.Router();

router.get('/', isAdminAuthenticated, brandController.listBrands);
router.post('/', isAdminAuthenticated, brandController.createBrand);
router.patch('/:id', isAdminAuthenticated, brandController.updateBrand);
router.delete('/:id', isAdminAuthenticated, brandController.deleteBrand);

export default router;

