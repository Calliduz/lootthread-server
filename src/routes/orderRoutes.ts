import express from 'express';
import { body } from 'express-validator';
import { createOrder } from '../controllers/orderController';

const router = express.Router();

router.post(
  '/',
  [
    body('items').isArray().notEmpty(),
    body('totalAmount').isNumeric(),
    body('paymentMethod').isString().notEmpty(),
  ],
  createOrder
);

export default router;
