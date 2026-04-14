import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { Artist as IArtist } from '../types';

export interface ArtistDocument extends IArtist, Document {
  password?: string;
  comparePassword: (password: string) => Promise<boolean>;
}

const artistSchema = new Schema<ArtistDocument>({
  name: { type: String, required: true, unique: true },
  bio: { type: String, required: true },
  avatar: { type: String, required: true },
  salesCount: { type: Schema.Types.Mixed, default: 0 }, // Can be "12K+" or numeric
  rating: { type: Number, default: 5 },
  password: { type: String, required: true, select: false },
  totalRevenue: { type: Number, default: 0 },
  activeSkinsCount: { type: Number, default: 0 }
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

artistSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Hash password before saving
artistSchema.pre('save', async function(this: ArtistDocument) {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password!, salt);
});

// Compare password
artistSchema.methods.comparePassword = async function(enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model<ArtistDocument>('Artist', artistSchema);
