export interface PublicShop {
  id: string;
  name: string;
  description: string | null;
  photos: string[];
  address: string;
  latitude: number;
  longitude: number;
  minOrderPrice: number;
  ratingAverage: number;
  ratingCount: number;
  isOpenManual: boolean;
  workingHours: Array<{
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isOpen: boolean;
  }>;
  deliveryZone: {
    maxKm: number;
    freeKm: number;
    pricingType: 'flat' | 'per_km' | 'per_500m';
    pricePerStep: number;
  };
  distanceKm?: number;
  deliveryFeeAtUser?: number;
  isWithinZone?: boolean;
}

export interface Category {
  id: string;
  slug: string;
  nameUzLatn: string;
  nameUzCyrl: string;
  nameRu: string;
  iconUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  children?: Category[];
}

export type FeedSort = 'relevance' | 'price_asc' | 'price_desc' | 'rating';

export interface PublicProductVariant {
  id: string;
  shopId: string;
  productFamilyId: string;
  name: string;
  photos: string[];
  description: string | null;
  unitType: 'piece' | 'kg' | 'liter' | 'gram' | 'pack';
  unitSize: number;
  price: number;
  discountPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  barcode: string | null;
  ratingAverage: number;
  ratingCount: number;
  productFamily?: {
    id: string;
    name: string;
    brand: string | null;
  };
}

/**
 * Item returned by `/catalog/products?lat=&lng=` — the global Home feed.
 * Extends a regular variant with a `shop` summary so the client doesn't need a
 * second fetch to render shop name + distance on each card.
 */
export interface FeedProduct extends PublicProductVariant {
  shop: {
    id: string;
    name: string;
    distanceKm: number;
    deliveryFeeAtUser: number;
    isOpen: boolean;
    photos: string[];
  };
}

export interface FeedResponse {
  items: FeedProduct[];
  nextPage: number | null;
}

/**
 * Single-variant detail returned by `/catalog/products/:variantId`.
 * Includes a shop summary (for add-to-cart + open state) and sibling variants
 * in the same product family (e.g. 0.5L / 1L / 1.5L).
 */
export interface VariantDetail extends PublicProductVariant {
  shop: {
    id: string;
    name: string;
    isOpenManual: boolean;
    minOrderPrice: number;
    photos: string[];
  } | null;
  siblings: PublicProductVariant[];
}

export interface ProductReview {
  id: string;
  stars: number;
  text: string | null;
  createdAt: string;
  userName: string;
}

export interface UserAddress {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  notes: string | null;
  isDefault: boolean;
}

export interface OrderItem {
  id: string;
  productVariantId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  returnedQuantity: number;
}

export type OrderStatus =
  | 'new'
  | 'accepted'
  | 'preparing'
  | 'delivering'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  shopId: string;
  shop?: PublicShop;
  deliveryAddressId: string;
  items: OrderItem[];
  subTotal: number;
  deliveryFee: number;
  total: number;
  distanceKm: number;
  status: OrderStatus;
  paymentMethod: 'cash' | 'click_online';
  timeline: Array<{ status: OrderStatus; at: string; note?: string }>;
  createdAt: string;
  /** Variant IDs the current user has already reviewed for this order (from GET /orders/:id). */
  reviewedVariantIds?: string[];
}

export interface MyShop {
  id: string;
  name: string;
  address: string;
  photos: string[];
  isOpenManual: boolean;
}

export interface MeUser {
  id: string;
  phone: string;
  name: string | null;
  avatarUrl: string | null;
  isSellerApproved: boolean;
  isAdmin: boolean;
}

export interface CartLine {
  variantId: string;
  shopId: string;
  shopName: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  photoUrl?: string;
}

export const STATUS_LABEL_UZ: Record<OrderStatus, string> = {
  new: 'Yangi',
  accepted: 'Qabul qilindi',
  preparing: 'Yig\'ilmoqda',
  delivering: 'Yetkazib berilmoqda',
  delivered: 'Yetkazildi',
  cancelled: 'Bekor qilindi',
};
