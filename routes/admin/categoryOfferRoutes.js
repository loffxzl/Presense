import express from 'express';
import * as categoryOfferController from '../../controllers/admin/categoryOfferController.js';
import { isAdminAuthenticated } from '../../middlewares/auth.js';

const router = express.Router();

router.get('/', isAdminAuthenticated, categoryOfferController.showOffers);
router.post('/:id', isAdminAuthenticated, categoryOfferController.saveOffer);
router.post('/:id/toggle', isAdminAuthenticated, categoryOfferController.toggleOffer);
router.post('/:id/remove', isAdminAuthenticated, categoryOfferController.removeOffer);

export default router;

