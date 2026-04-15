import { Response } from 'express';
import Order from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

// ---------------------------------------------------------------------------
// @desc    Create a new order (authenticated)
// @route   POST /api/orders
// @access  Private
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
      status: 'pending',
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

// ---------------------------------------------------------------------------
// @desc    Get all orders (Admin)
// @route   GET /api/orders/admin/all
// @access  Admin
// ---------------------------------------------------------------------------
export const getAllOrders = async (_req: AuthRequest, res: Response): Promise<any> => {
  try {
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .populate('userId', 'name email');
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error fetching orders.' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
// @access  Admin
// ---------------------------------------------------------------------------
export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.json({ message: 'Order status updated.', order });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error updating order.' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Admin dashboard aggregated stats
// @route   GET /api/orders/admin/stats
// @access  Admin
// ---------------------------------------------------------------------------
export const getAdminDashboardStats = async (_req: AuthRequest, res: Response): Promise<any> => {
  try {
    const [revenueAgg, pendingOrdersCount, totalProducts, totalUsers] = await Promise.all([
      // Sum revenue from completed + processing orders
      Order.aggregate([
        { $match: { status: { $in: ['completed', 'processing'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.countDocuments({ status: 'pending' }),
      Product.countDocuments({}),
      User.countDocuments({ role: 'customer' }),
    ]);

    const totalRevenue = revenueAgg[0]?.total ?? 0;

    res.json({
      totalRevenue,
      pendingOrdersCount,
      totalProducts,
      totalUsers,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error fetching stats.' });
  }
};
