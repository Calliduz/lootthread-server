import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOrderItem {
  productId: Types.ObjectId | string;
  name: string;
  price: number;
  imageUrl?: string;
  quantity: number;
}

export interface IOrder extends Document {
  userId?: Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  gameTag?: string;
  deliveryAddress?: string;
  paymentMethod: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
}

const orderItemSchema = new Schema<IOrderItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name:      { type: String, required: true },
  price:     { type: Number, required: true },
  imageUrl:  { type: String },
  quantity:  { type: Number, required: true, min: 1 },
}, { _id: false });

const orderSchema = new Schema<IOrder>({
  userId:        { type: Schema.Types.ObjectId, ref: 'User' },
  items:         { type: [orderItemSchema], required: true },
  totalAmount:   { type: Number, required: true },
  gameTag:         { type: String },
  deliveryAddress: { type: String },
  paymentMethod: { type: String, required: true, default: 'simulated' },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled'],
    default: 'completed',
  },
}, { timestamps: true });

export default mongoose.model<IOrder>('Order', orderSchema);
