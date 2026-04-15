import { Request, Response } from 'express';
import Order from '../models/Order';
import { AuthRequest } from '../middleware/auth';

// ---------------------------------------------------------------------------
// @desc    Create a new order (authenticated)
// @route   POST /api/orders
// @access  Private (customer + admin)
// ---------------------------------------------------------------------------
export const createOrder = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { items, totalAmount, gameTag, paymentMethod } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item.' });
    }
    if (typeof totalAmount !== 'number' || totalAmount <= 0) {
      return res.status(400).json({ message: 'Invalid total amount.' });
    }

    const order = await Order.create({
      userId: req.user?.id,
      items,
      totalAmount,
      gameTag: gameTag || '',
      paymentMethod: paymentMethod || 'simulated',
      status: 'completed',
    });

    res.status(201).json({
      orderId: order._id,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: (order as any).createdAt,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error creating order.' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Get current user's orders
// @route   GET /api/orders/my
// @access  Private
// ---------------------------------------------------------------------------
export const getMyOrders = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const orders = await Order.find({ userId: req.user?.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error fetching orders.' });
  }
};
