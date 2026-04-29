import { Request, Response } from 'express';
import Review from '../models/Review';
import Order from '../models/Order';
import { AuthRequest } from '../middleware/auth';

// @desc    Add a product review
// @route   POST /api/reviews
// @access  Private
export const addReview = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { productId, rating, comment } = req.body;

    if (!rating || !comment || !productId) {
      return res.status(400).json({ message: 'Please provide rating, comment and productId.' });
    }

    // Check if user already reviewed
    const existingReview = await Review.findOne({ userId: req.user?.id, productId });
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product.' });
    }

    // Check if verified buyer (has a completed order for this product)
    const hasOrdered = await Order.findOne({
      userId: req.user?.id,
      status: 'completed',
      'items.productId': productId
    });

    const review = await Review.create({
      userId: req.user?.id,
      productId,
      rating,
      comment
    });

    res.status(201).json({
      message: 'Review added successfully.',
      review: {
        ...review.toObject(),
        isVerified: !!hasOrdered
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error adding review.' });
  }
};

// @desc    Get reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
export const getProductReviews = async (req: Request, res: Response): Promise<any> => {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({ productId })
      .populate('userId', 'name avatarUrl')
      .sort({ createdAt: -1 });

    // For each review, check if user is verified buyer
    const reviewsWithVerifiedStatus = await Promise.all(reviews.map(async (review: any) => {
      const hasOrdered = await Order.findOne({
        userId: review.userId?._id,
        status: 'completed',
        'items.productId': productId
      });
      return {
        ...review.toObject(),
        isVerified: !!hasOrdered
      };
    }));

    // Calculate average
    const stats = await Review.aggregate([
      { $match: { productId: new (require('mongoose').Types.ObjectId)(productId) } },
      { $group: { _id: '$productId', average: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    res.json({
      reviews: reviewsWithVerifiedStatus,
      averageRating: stats[0]?.average || 0,
      totalReviews: stats[0]?.count || 0
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error fetching reviews.' });
  }
};
