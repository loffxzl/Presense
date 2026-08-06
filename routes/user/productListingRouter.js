import express from 'express';
import * as ProductListController from '../../controllers/user/productListController.js';
import { isUserAuthenticated } from '../../middlewares/auth.js';

const router = express.Router();

router.get('/', isUserAuthenticated,ProductListController.getProduct);

export default router;