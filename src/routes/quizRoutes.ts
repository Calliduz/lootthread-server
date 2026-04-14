import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';

const router = express.Router();

router.post(
  '/',
  [
    body('answers').isObject().notEmpty(),
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Recommendation logic placeholder
    const { answers } = req.body;
    res.json({
      mouse: {
        name: 'Viper V3 Pro',
        description: `Perfect for your ${answers[2] || 'claw'} grip.`,
      }
    });
  }
);

export default router;
