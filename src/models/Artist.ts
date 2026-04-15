import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IArtist {
  name: string;
  bio?: string;
  /** Legacy field — kept for backward compatibility with existing data */
  avatar?: string;
  /** Primary display image URL */
  imageUrl?: string;
  salesCount?: string | number;
  rating?: number;
  totalRevenue?: number;
  activeSkinsCount?: number;
  isActive: boolean;
}

export interface ArtistDocument extends IArtist, Document {
  _id: Types.ObjectId;
}

const artistSchema = new Schema<ArtistDocument>(
  {
    name:              { type: String, required: true, unique: true, trim: true },
    bio:               { type: String, default: '' },
    avatar:            { type: String }, // legacy — retain for existing records
    imageUrl:          { type: String }, // preferred going forward
    salesCount:        { type: Schema.Types.Mixed, default: 0 }, // supports '12K+' or numeric
    rating:            { type: Number, default: 5, min: 0, max: 5 },
    totalRevenue:      { type: Number, default: 0 },
    activeSkinsCount:  { type: Number, default: 0 },
    isActive:          { type: Boolean, default: true },
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

artistSchema.virtual('id').get(function (this: ArtistDocument) {
  return this._id.toHexString();
});

export default mongoose.model<ArtistDocument>('Artist', artistSchema);
