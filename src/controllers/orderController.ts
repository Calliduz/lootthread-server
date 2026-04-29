import { Response } from 'express';
import Order from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';
import PromoCode from '../models/PromoCode';
import { AuthRequest } from '../middleware/auth';
import { isCodeValid } from './promoCodeController';
import Stripe from 'stripe';
import { sendOrderConfirmation, sendOrderStatusUpdate } from '../services/mailService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2023-10-16' as any,
});

// ---------------------------------------------------------------------------
// Shared leveling formula
// 1 XP per ₱1 spent. Level up every 5,000 XP (₱5,000 spent).
// ---------------------------------------------------------------------------
export const calculateLevel = (xp: number): number => Math.floor(xp / 5000) + 1;

// ---------------------------------------------------------------------------
// @desc    Create a new order (authenticated)
// @route   POST /api/orders
// @access  Private
// ---------------------------------------------------------------------------
export const createOrder = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { items, totalAmount, deliveryAddress, paymentMethod, promoCode } = req.body;

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

    // --- STOCK DEDUCTION ---
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
    }

    // --- XP GRANT (1 XP per ₱1 spent) ---
    try {
      const user = await User.findById(req.user?.id);
      if (user) {
        const earnedXp = Math.floor(totalAmount);
        user.xp = (user.xp || 0) + earnedXp;
        user.level = calculateLevel(user.xp);
        await user.save();
        console.log(`[XP] User ${user._id} earned ${earnedXp} XP. Total: ${user.xp} XP, Level: ${user.level}`);
      }
    } catch (xpError) {
      console.error('XP grant failed:', xpError);
    }

    // --- INCREMENT PROMO USAGE ---
    if (promoCode) {
      try {
        await PromoCode.findOneAndUpdate(
          { code: (promoCode as string).toUpperCase().trim() },
          { $inc: { usedCount: 1 } }
        );
      } catch (promoError) {
        console.error('Promo usage increment failed:', promoError);
      }
    }

    // --- EMAIL NOTIFICATION ---
    try {
      const user = await User.findById(req.user?.id);
      if (user && user.email) {
        await sendOrderConfirmation(user.email, order);
      }
    } catch (mailError) {
      console.error('Order confirmation email failed:', mailError);
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
// @desc    Create Stripe Payment Intent (PHP currency + promo discount)
// @route   POST /api/orders/create-payment-intent
// @access  Private
// ---------------------------------------------------------------------------
export const createPaymentIntent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { items, promoCode } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item.' });
    }

    // 1. Get real prices from DB
    const itemIds = items.map((i: any) => i.productId);
    const dbProducts = await Product.find({ _id: { $in: itemIds } });

    // 2. Calculate subtotal in centavos (PHP uses centavos as smallest unit)
    let subtotalCentavos = 0;
    for (const item of items) {
      const dbProduct = dbProducts.find((p: any) => p._id.toString() === item.productId);
      if (dbProduct) {
        subtotalCentavos += Math.round(dbProduct.price * 100) * item.quantity;
      }
    }

    if (subtotalCentavos <= 0) {
      return res.status(400).json({ message: 'Invalid total amount for payment.' });
    }

    // 3. Apply promo code discount (server-side validation)
    let discountPercent = 0;
    let discountAmountCentavos = 0;
    let appliedPromoCode: string | null = null;

    if (promoCode) {
      const promo = await PromoCode.findOne({ code: (promoCode as string).toUpperCase().trim() });
      if (promo) {
        const user = await User.findById(req.user?.id);
        const userLevel = user?.level ?? 1;
        const { valid } = isCodeValid(promo, userLevel);
        if (valid) {
          discountPercent = promo.discountPercent;
          discountAmountCentavos = Math.round(subtotalCentavos * discountPercent / 100);
          appliedPromoCode = promo.code;
        }
      }
    }

    const totalCentavos = subtotalCentavos - discountAmountCentavos;
    const finalCentavos = Math.max(totalCentavos, 2000); // Stripe PHP minimum: ₱20.00

    // 4. Create Stripe PaymentIntent in PHP
    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalCentavos,
      currency: 'php',
      automatic_payment_methods: { enabled: true },
      metadata: {
        promoCode: appliedPromoCode || '',
        discountPercent: discountPercent.toString(),
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      subtotal: subtotalCentavos / 100,
      discountPercent,
      discountAmount: discountAmountCentavos / 100,
      total: finalCentavos / 100,
      appliedPromoCode,
    });
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

    if (!order) return res.status(404).json({ message: 'Order not found.' });

    // --- EMAIL NOTIFICATION ---
    try {
      const populatedOrder = await order.populate('userId', 'email');
      const user: any = populatedOrder.userId;
      if (user && user.email) {
        await sendOrderStatusUpdate(user.email, order);
      }
    } catch (mailError) {
      console.error('Status update email failed:', mailError);
    }

    res.json({ message: 'Order status updated.', order });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error updating order.' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Update multiple order statuses (Admin)
// @route   PUT /api/orders/bulk-status
// @access  Admin
// ---------------------------------------------------------------------------
export const updateBulkOrderStatus = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { ids, status } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No order IDs provided.' });
    }

    const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const result = await Order.updateMany(
      { _id: { $in: ids } },
      { $set: { status } }
    );

    // --- EMAIL NOTIFICATIONS (ASYNC) ---
    Order.find({ _id: { $in: ids } }).populate('userId', 'email').then(orders => {
      orders.forEach(o => {
        const user: any = o.userId;
        if (user && user.email) {
          sendOrderStatusUpdate(user.email, o).catch(e => console.error(`Failed to send bulk update email to ${user.email}:`, e));
        }
      });
    }).catch(e => console.error('Failed to fetch orders for bulk email notifications:', e));

    res.json({ message: `${result.modifiedCount} orders updated.`, modifiedCount: result.modifiedCount });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error bulk updating orders.' });
  }
};

// ---------------------------------------------------------------------------
// @desc    Admin dashboard aggregated stats
// @route   GET /api/orders/admin/stats
// @access  Admin
// ---------------------------------------------------------------------------
export const getAdminDashboardStats = async (_req: AuthRequest, res: Response): Promise<any> => {
  try {
    const [revenueAgg, pendingOrdersCount, totalProducts, totalUsers, recentOrders, monthlyRevenue, topProducts] = await Promise.all([
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
      Order.aggregate([
        { $match: { status: { $in: ['completed', 'processing'] } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            revenue: { $sum: "$totalAmount" }
          }
        },
        { $sort: { "_id": 1 } },
        { $limit: 6 }
      ]),
      Order.aggregate([
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.name",
            sales: { $sum: "$items.quantity" },
            revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
          }
        },
        { $sort: { sales: -1 } },
        { $limit: 5 }
      ])
    ]);

    const totalRevenue = revenueAgg[0]?.total ?? 0;

    res.json({
      totalRevenue,
      pendingOrdersCount,
      totalProducts,
      totalUsers,
      recentOrders: recentOrders || [],
      monthlyRevenue: monthlyRevenue || [],
      topProducts: topProducts || []
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error fetching stats.' });
  }
};
