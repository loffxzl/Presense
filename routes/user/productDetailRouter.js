import express from 'express';
import * as productDetailContoller from '../../controllers/user/productDetailController.js'

const router = express.Router();

router.get('/:slug', productDetailContoller.getProductDetail);

export default router;