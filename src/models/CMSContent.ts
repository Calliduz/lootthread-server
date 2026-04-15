import mongoose, { Schema, Document, Types } from 'mongoose';

export type CMSContentType = 'text' | 'json' | 'image' | 'array';

/**
 * CMSContent — Storefront dynamic content blocks.
 *
 * Each document represents a keyed content slot that the admin panel
 * can update without a code deploy.
 *
 * Examples:
 *   key: 'marquee_banner'  type: 'text'   value: 'Summer Drop is LIVE 🔥'
 *   key: 'footer_socials'  type: 'json'   value: { twitter: '...', ig: '...' }
 *   key: 'hero_image'      type: 'image'  value: 'https://cdn.../hero.webp'
 *   key: 'featured_tags'   type: 'array'  value: ['new', 'trending', 'sale']
 */
export interface ICMSContent {
  key: string;
  type: CMSContentType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any;
  isActive: boolean;
}

export interface CMSContentDocument extends ICMSContent, Document {
  _id: Types.ObjectId;
}

const cmsContentSchema = new Schema<CMSContentDocument>(
  {
    key: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
      lowercase: true,
    },
    type: {
      type:     String,
      enum:     ['text', 'json', 'image', 'array'] as CMSContentType[],
      required: true,
      default:  'text',
    },
    value:    { type: Schema.Types.Mixed },
    isActive: { type: Boolean, default: true },
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

cmsContentSchema.virtual('id').get(function (this: CMSContentDocument) {
  return this._id.toHexString();
});

// Quickly fetch all active content blocks (most common query)
cmsContentSchema.index({ isActive: 1 });

export default mongoose.model<CMSContentDocument>('CMSContent', cmsContentSchema);
