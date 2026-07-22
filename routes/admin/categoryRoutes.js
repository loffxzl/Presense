import express from 'express';
import * as categoryController from '../../controllers/admin/categoryController.js';
import { isAdminAuthenticated } from '../../middlewares/auth.js';
import { uploadSingle } from '../../config/multer.js'

const router = express.Router();

router.get('/', isAdminAuthenticated,categoryController.getCategory);
router.post('/', isAdminAuthenticated,uploadSingle.single('image'),categoryController.addCategory);
router.patch('/:id', isAdminAuthenticated,uploadSingle.single('image'),categoryController.editCategory);
router.delete('/:id', isAdminAuthenticated,categoryController.deleteCategory);

// router.post('/', isAdminAuthenticated, (req, res, next) => {
//   uploadSingle.single('image')(req, res, (err) => {

//     console.log('After multer - FILE:', req.file);
//     console.log('After multer - BODY:', req.body);
//     next();
//   });
// }, categoryController.addCategory);

export default router;