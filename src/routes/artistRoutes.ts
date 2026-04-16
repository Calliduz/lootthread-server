import express from 'express';
import {
  getArtists,
  getArtistsAdmin,
  getArtistById,
  createArtist,
  updateArtist,
  deleteArtist,
  getArtistStats,
  getArtistAnalytics,
  loginArtist,
} from '../controllers/artistController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// Public
router.get('/',    getArtists);
router.get('/:id', getArtistById);

// Admin CRUD
router.get('/admin/all', protect, authorize('admin'), getArtistsAdmin);
router.post('/',    protect, authorize('admin'), createArtist);
router.put('/:id',  protect, authorize('admin'), updateArtist);
router.delete('/:id', protect, authorize('admin'), deleteArtist);

// Dashboard (admin-only)
router.get('/:id/stats',     protect, authorize('admin'), getArtistStats);
router.get('/:id/analytics', protect, authorize('admin'), getArtistAnalytics);

// Deprecated — returns 410 Gone
router.post('/login', loginArtist);

export default router;
