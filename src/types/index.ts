/**
 * LOOT THREAD SHARED TYPES
 * Single source of truth for API contract types shared across the backend.
 *
 * NOTE: Model-specific interfaces now live in their own model files and
 * re-export from there; keeping core auth/payload types here.
 */

// Re-export from models so consumers have one import path
export type { IArtist, ArtistDocument }        from '../models/Artist';
export type { IProduct, ProductDocument, ProductType } from '../models/Product';
export type { ICollection, CollectionDocument } from '../models/Collection';
export type { ICMSContent, CMSContentDocument, CMSContentType } from '../models/CMSContent';
export type { IUser, UserDocument, UserRole }   from '../models/User';

// ---------------------------------------------------------------------------
// Order types (owned here since Order model has no separate interface file)
// ---------------------------------------------------------------------------
export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CreateOrderRequest {
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: string;
  customerEmail?: string; // optional — for guest checkout
}

// ---------------------------------------------------------------------------
// JWT Payload
// ---------------------------------------------------------------------------
export interface UserPayload {
  id: string;
  role: 'admin' | 'customer';
}
