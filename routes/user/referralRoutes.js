import express from 'express';
import * as referralController from '../../controllers/user/referralController.js';
import { isUserAuthenticated } from '../../middlewares/auth.js';

const router = express.Router();

router.get('/', isUserAuthenticated, referralController.showReferrals);

export default router;

