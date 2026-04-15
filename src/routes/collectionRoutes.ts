import express from 'express';
import {
  getCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
} from '../controllers/collectionController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// Public
router.get('/',    getCollections);
router.get('/:id', getCollectionById);

// Admin
router.post('/',      protect, authorize('admin'), createCollection);
router.put('/:id',    protect, authorize('admin'), updateCollection);
router.delete('/:id', protect, authorize('admin'), deleteCollection);

export default router;
