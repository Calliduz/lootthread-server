import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICollection {
  name: string;
  description?: string;
  releaseDate?: Date;
  isActive: boolean;
}

export interface CollectionDocument extends ICollection, Document {
  _id: Types.ObjectId;
}

const collectionSchema = new Schema<CollectionDocument>(
  {
    name:        { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    releaseDate: { type: Date },
    isActive:    { type: Boolean, default: true },
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

collectionSchema.virtual('id').get(function (this: CollectionDocument) {
  return this._id.toHexString();
});

// Index: querying active collections by release date is a common pattern
collectionSchema.index({ isActive: 1, releaseDate: -1 });

export default mongoose.model<CollectionDocument>('Collection', collectionSchema);
