// routes/admin/salesReportRoutes.js
import express from 'express';
import * as salesReportController from '../../controllers/admin/salesReportController.js';
import { isAdminAuthenticated } from '../../middlewares/auth.js';

const router = express.Router();

router.get('/', isAdminAuthenticated, salesReportController.showSalesReport);
router.get('/download/pdf', isAdminAuthenticated, salesReportController.downloadPdf);
router.get('/download/excel', isAdminAuthenticated, salesReportController.downloadExcel);

export default router;

