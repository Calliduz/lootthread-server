import express from 'express';
import { getProducts, getProductById, createProduct } from '../controllers/productController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.route('/')
  .get(getProducts)
  .post(protect, authorize('artist', 'admin'), createProduct);

router.route('/:id')
  .get(getProductById);

export default router;
