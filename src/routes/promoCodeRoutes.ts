import express from 'express';
import {
  validatePromoCode,
  getEligiblePromoCodes,
  getAllPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
} from '../controllers/promoCodeController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// ── Customer routes ──────────────────────────────────────────────────────────
router.post('/validate', protect, validatePromoCode);
router.get('/eligible', protect, getEligiblePromoCodes);

// ── Admin routes ─────────────────────────────────────────────────────────────
router.get('/',    protect, authorize('admin'), getAllPromoCodes);
router.post('/',   protect, authorize('admin'), createPromoCode);
router.put('/:id', protect, authorize('admin'), updatePromoCode);
router.delete('/:id', protect, authorize('admin'), deletePromoCode);

export default router;
