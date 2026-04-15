import mongoose, { Schema, Document, Types } from 'mongoose';

// Product type enum — covers all LootThread product verticals
export type ProductType = 'skin' | 'attachment' | 'apparel' | 'individual';

export interface IProduct {
  // --- Identity ---
  name: string;
  title?: string;           // display alias for name
  description: string;
  imageUrl?: string;        // primary image (single)
  images?: string[];        // gallery images (multi)
  // --- Pricing & Stock ---
  price: number;
  stockQuantity?: number;   // preferred field name going forward
  inventory?: number;       // legacy alias — kept for backward compat
  // --- Classification ---
  type: ProductType;        // replaces the old narrow 'category'
  subCategory?: string;
  tags?: string[];
  // --- Relations ---
  artistId?: Types.ObjectId;
  collectionId?: Types.ObjectId;
}

export interface ProductDocument extends IProduct, Document {
  _id: Types.ObjectId;
}

const productSchema = new Schema<ProductDocument>(
  {
    // --- Identity ---
    name:          { type: String, required: true, trim: true },
    title:         { type: String, trim: true },      // optional display title
    description:   { type: String, required: true },
    imageUrl:      { type: String },                  // single hero image
    images:        [{ type: String }],                // gallery

    // --- Pricing & Stock ---
    price:         { type: Number, required: true, min: 0 },
    stockQuantity: { type: Number, default: 0, min: 0 }, // preferred
    inventory:     { type: Number, default: 0, min: 0 }, // legacy

    // --- Classification ---
    type: {
      type: String,
      enum: ['skin', 'attachment', 'apparel', 'individual'],
      required: true,
    },
    subCategory:   { type: String },
    tags:          [{ type: String }],

    // --- Relations ---
    artistId:      { type: Schema.Types.ObjectId, ref: 'Artist' },
    collectionId:  { type: Schema.Types.ObjectId, ref: 'Collection' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret) {
        const { _id, __v, ...rest } = ret;
        return { id: (_id as Types.ObjectId).toString(), ...rest };
      },
    },
    toObject: { virtuals: true },
  }
);

productSchema.virtual('id').get(function (this: ProductDocument) {
  return this._id.toHexString();
});

export default mongoose.model<ProductDocument>('Product', productSchema);
