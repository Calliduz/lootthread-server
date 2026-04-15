import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getRelatedProducts,
} from '../controllers/productController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// Public
router.get('/',           getProducts);
router.get('/:id',         getProductById);
router.get('/:id/related', getRelatedProducts);

// Admin
router.post('/',      protect, authorize('admin'), createProduct);
router.put('/:id',    protect, authorize('admin'), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

export default router;
