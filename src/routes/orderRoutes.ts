import express from 'express';
import { createOrder, getMyOrders } from '../controllers/orderController';
import { protect } from '../middleware/auth';

const router = express.Router();

// POST /api/orders — protected, any logged-in user
router.post('/', protect, createOrder);

// GET /api/orders/my — get current user's order history
router.get('/my', protect, getMyOrders);

export default router;
