import mongoose, { Schema, Document } from 'mongoose';
import { Product as IProduct } from '../types';

export interface ProductDocument extends IProduct, Document {}

const productSchema = new Schema<ProductDocument>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, enum: ['skin', 'attachment'], required: true },
  subCategory: { type: String, required: true },
  images: [{ type: String, required: true }],
  inventory: { type: Number, required: true, default: 0 },
  tags: [{ type: String }],
  artistId: { type: Schema.Types.ObjectId, ref: 'Artist' },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      const { _id, __v, ...rest } = ret;
      return { id: _id.toString(), ...rest };
    }
  },
  toObject: { virtuals: true }
});

productSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

export default mongoose.model<ProductDocument>('Product', productSchema);
