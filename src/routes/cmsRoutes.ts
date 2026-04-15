import express from 'express';
import {
  getCMSByKey,
  getAllCMS,
  createCMS,
  updateCMS,
  deleteCMS,
} from '../controllers/cmsController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// Public — storefront fetches a block by key
router.get('/:key', getCMSByKey);

// Admin
router.get('/',       protect, authorize('admin'), getAllCMS);
router.post('/',      protect, authorize('admin'), createCMS);
router.put('/:id',    protect, authorize('admin'), updateCMS);
router.delete('/:id', protect, authorize('admin'), deleteCMS);

export default router;
