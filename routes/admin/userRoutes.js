import express from 'express';
import * as userController from '../../controllers/admin/userController.js';
import { isAdminAuthenticated } from '../../middlewares/auth.js';


const router = express.Router();

router.get('/',isAdminAuthenticated,userController.getUserList);
router.patch('/:id/toggle-status',isAdminAuthenticated,userController.toggleUserStatus);

export default router;