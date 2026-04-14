/**
 * LOOT THREAD SHARED TYPES
 * Mirrored from frontend to maintain API contract consistency.
 */

export interface Product {
  name: string;
  description: string;
  price: number;
  category: 'skin' | 'attachment';
  subCategory: string;
  images: string[];
  inventory: number;
  tags: string[];
  artistId?: string;
  createdAt: Date | string;
}

export interface Artist {
  name: string;
  bio: string;
  avatar: string;
  salesCount: string | number;
  rating: number;
  totalRevenue?: number;
  activeSkinsCount?: number;
}

export interface OrderItem extends Product {
  quantity: number;
}

export interface CreateOrderRequest {
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: string;
}

/**
 * AUTH & USER
 */

export interface UserPayload {
  id: string;
  role: 'artist' | 'admin' | 'user';
}
