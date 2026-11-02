import express from 'express';
import * as referralController from '../../controllers/admin/referralController.js';
import { isAdminAuthenticated } from '../../middlewares/auth.js';

const router = express.Router();

router.get('/', isAdminAuthenticated, referralController.showReferrals);
router.post('/settings', isAdminAuthenticated, referralController.saveSettings);

export default router;

