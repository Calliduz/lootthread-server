import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPromoCode {
  code: string;               // e.g. "LEVEL5LOOT"
  description?: string;       // Admin notes about this code
  discountPercent: number;    // e.g. 15 = 15% off
  minLevel: number;           // Minimum user level required (0 = anyone)
  expiryDate?: Date;          // Automatic expiry (null = never expires)
  usageLimit?: number;        // Max total redemptions (null = unlimited)
  usedCount: number;          // Running total of uses
  isActive: boolean;          // Admin master toggle
}

export interface PromoCodeDocument extends IPromoCode, Document {
  _id: Types.ObjectId;
}

const promoCodeSchema = new Schema<PromoCodeDocument>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: { type: String, trim: true },
    discountPercent: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    minLevel: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiryDate: { type: Date, default: null },
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        const { _id, __v, ...rest } = ret;
        return { id: (_id as Types.ObjectId).toString(), ...rest };
      },
    },
  }
);

export default mongoose.model<PromoCodeDocument>('PromoCode', promoCodeSchema);
