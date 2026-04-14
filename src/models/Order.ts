import mongoose, { Schema, Document } from 'mongoose';

const orderSchema = new Schema({
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'cancelled'], default: 'pending' },
  customerEmail: { type: String }, // Optional, for guest checkout
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Order', orderSchema);
