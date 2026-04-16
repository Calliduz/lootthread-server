import express from 'express';
import {
  validatePromoCode,
  getAllPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
} from '../controllers/promoCodeController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// ── Customer routes ──────────────────────────────────────────────────────────
router.post('/validate', protect, validatePromoCode);

// ── Admin routes ─────────────────────────────────────────────────────────────
router.get('/',    protect, authorize('admin'), getAllPromoCodes);
router.post('/',   protect, authorize('admin'), createPromoCode);
router.put('/:id', protect, authorize('admin'), updatePromoCode);
router.delete('/:id', protect, authorize('admin'), deletePromoCode);

export default router;
