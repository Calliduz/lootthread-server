import { Response } from 'express';
import Order from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2023-10-16' as any,
});

// ---------------------------------------------------------------------------
// @desc    Create a new order (authenticated)
// @route   POST /api/orders
// @access  Private
// ---------------------------------------------------------------------------
export const createOrder = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { items, totalAmount, deliveryAddress, paymentMethod } = req.body;

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
      deliveryAddress: deliveryAddress || '',
      paymentMethod: paymentMethod || 'simulated',
      status: 'pending',
    });

    // --- DYNAMIC STOCK DEDUCTION ---
    try {
      const stockUpdates = items.map((item: any) => ({
        updateOne: {
          filter: { _id: item.productId },
          update: { $inc: { stockQuantity: -item.quantity } }
        }
      }));

      await Product.bulkWrite(stockUpdates);
    } catch (stockError) {
      console.error('Stock deduction failed:', stockError);
      // We don't block the order if stock deduction fails, but we log it
    }

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
// @desc    Create Stripe Payment Intent
// @route   POST /api/orders/create-payment-intent
// @access  Private
// ---------------------------------------------------------------------------
export const createPaymentIntent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item.' });
    }

    // 1. Get real prices from DB
    const itemIds = items.map((i: any) => i.productId);
    const dbProducts = await Product.find({ _id: { $in: itemIds } });

    // 2. Calculate total in cents
    let totalCents = 0;
    for (const item of items) {
      const dbProduct = dbProducts.find((p: any) => p._id.toString() === item.productId);
      if (dbProduct) {
        totalCents += Math.round(dbProduct.price * 100) * item.quantity;
      }
    }

    if (totalCents <= 0) {
      return res.status(400).json({ message: 'Invalid total amount for payment.' });
    }

    // 3. Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error creating payment intent.' });
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
    const [revenueAgg, pendingOrdersCount, totalProducts, totalUsers, recentOrders] = await Promise.all([
      // Sum revenue from completed + processing orders
      Order.aggregate([
        { $match: { status: { $in: ['completed', 'processing'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.countDocuments({ status: 'pending' }),
      Product.countDocuments({}),
      User.countDocuments({ role: 'customer' }),
      Order.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userId', 'name email'),
    ]);

    const totalRevenue = revenueAgg[0]?.total ?? 0;

    res.json({
      totalRevenue,
      pendingOrdersCount,
      totalProducts,
      totalUsers,
      recentOrders: recentOrders || [],
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error fetching stats.' });
  }
};
