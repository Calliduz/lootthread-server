import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'admin' | 'customer';

export interface IUser {
  // --- Identity ---
  name: string;
  email: string;
  // --- Auth: Password ---
  password?: string;        // hashed; undefined for pure OAuth users
  // --- Auth: OAuth ---
  googleId?: string;
  githubId?: string;
  // --- Auth: OTP / Password Reset ---
  resetPasswordOtp?: string;
  resetPasswordExpires?: Date;
  // --- Access Control ---
  role: UserRole;
  // --- Profile ---
  avatarUrl?: string;
  isActive: boolean;
}

export interface UserDocument extends IUser, Document {
  _id: Types.ObjectId;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<UserDocument>(
  {
    // --- Identity ---
    name:  { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },

    // --- Auth: Password (select:false keeps it out of default queries) ---
    password: { type: String, select: false },

    // --- Auth: OAuth ---
    googleId: { type: String, sparse: true }, // sparse index allows multiple nulls
    githubId: { type: String, sparse: true },

    // --- Auth: OTP ---
    resetPasswordOtp:     { type: String, select: false },
    resetPasswordExpires: { type: Date,   select: false },

    // --- Access Control ---
    role: {
      type:    String,
      enum:    ['admin', 'customer'] as UserRole[],
      default: 'customer',
      required: true,
    },

    // --- Profile ---
    avatarUrl: { type: String },
    isActive:  { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret) {
        // Never expose sensitive fields in JSON output
        const { _id, __v, password, resetPasswordOtp, resetPasswordExpires, ...rest } = ret;
        return { id: (_id as Types.ObjectId).toString(), ...rest };
      },
    },
    toObject: { virtuals: true },
  }
);

userSchema.virtual('id').get(function (this: UserDocument) {
  return this._id.toHexString();
});

// ---------------------------------------------------------------------------
// Hash password before saving (only if modified and present)
// ---------------------------------------------------------------------------
userSchema.pre('save', async function (this: UserDocument) {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// ---------------------------------------------------------------------------
// Instance method: Compare a plaintext password against the stored hash
// ---------------------------------------------------------------------------
userSchema.methods.comparePassword = async function (
  this: UserDocument,
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<UserDocument>('User', userSchema);
