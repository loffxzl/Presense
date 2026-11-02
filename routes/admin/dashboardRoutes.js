import express from 'express';
import * as dashboardController from '../../controllers/admin/dashboardController.js';
import { isAdminAuthenticated } from '../../middlewares/auth.js';

const router = express.Router();

router.get('/', isAdminAuthenticated, dashboardController.getDashboard);
router.get('/ledger', isAdminAuthenticated, dashboardController.downloadLedger);

export default router;