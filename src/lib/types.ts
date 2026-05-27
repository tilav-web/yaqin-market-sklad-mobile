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
  barcode: string | null;
  ratingAverage: number;
  productFamily?: {
    id: string;
    name: string;
    brand: string | null;
  };
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
