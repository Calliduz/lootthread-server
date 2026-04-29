import express from 'express';
import { addReview, getProductReviews } from '../controllers/reviewController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post('/', protect, addReview);
router.get('/product/:productId', getProductReviews);

export default router;
