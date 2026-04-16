import express, { Request, Response } from 'express';
import Newsletter from '../models/Newsletter';
import { broadcastEmail } from '../controllers/newsletterController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.post('/subscribe', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const existing = await Newsletter.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Already subscribed!' });
    }

    await Newsletter.create({ email });
    res.status(201).json({ message: 'Successfully subscribed!' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
});

// Admin Routes
router.post('/broadcast', protect, authorize('admin'), broadcastEmail);

export default router;
