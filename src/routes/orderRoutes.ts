import express from 'express';
import {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  updateBulkOrderStatus,
  getAdminDashboardStats,
  createPaymentIntent,
} from '../controllers/orderController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// ── Customer routes ──────────────────────────────────────────────────────────
router.post('/',    protect, createOrder);
router.post('/create-payment-intent', protect, createPaymentIntent);
router.get('/my',   protect, getMyOrders);

// ── Admin routes ─────────────────────────────────────────────────────────────
router.get('/admin/stats', protect, authorize('admin'), getAdminDashboardStats);
router.get('/admin/all',   protect, authorize('admin'), getAllOrders);
router.put('/bulk-status', protect, authorize('admin'), updateBulkOrderStatus);
router.put('/:id/status',  protect, authorize('admin'), updateOrderStatus);

export default router;
