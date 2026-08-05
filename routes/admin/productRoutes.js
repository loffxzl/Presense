import express from 'express';
import * as productController from '../../controllers/admin/productController.js';
import { isAdminAuthenticated } from '../../middlewares/auth.js';
import { uploadMultiple } from '../../config/multer.js';
import handleUpload from '../../middlewares/handleUpload.js';

const router = express.Router();

router.get('/', isAdminAuthenticated,productController.getProduct);
router.post('/', isAdminAuthenticated, handleUpload(uploadMultiple.array('images',5)), productController.addProduct);
router.patch('/:id', isAdminAuthenticated, handleUpload(uploadMultiple.array("images",5)), productController.editProduct);
router.delete('/:id', isAdminAuthenticated, productController.deleteProduct);



export default router;