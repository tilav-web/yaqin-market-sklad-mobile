import type { TranslationKey } from '@/i18n/translations';

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: [number, number][][]; // [[[lng, lat], ...]] — GeoJSON standard
}

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
  holidays?: Array<{ date: string; reason?: string }>;
  deliveryZone: {
    maxKm: number;
    freeKm: number;
    pricingType: 'flat' | 'per_km' | 'per_500m' | 'per_100m';
    pricePerStep: number;
  };
  deliveryPolygon?: GeoJsonPolygon | null;
  freeDeliveryPolygon?: GeoJsonPolygon | null;
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

export type UnitType = 'piece' | 'kg' | 'liter' | 'gram' | 'pack';

export interface PublicProductVariant {
  id: string;
  shopId: string;
  globalProductId: string;
  name: string;
  brand: string | null;
  photos: string[];
  description: string | null;
  unitType: UnitType;
  unitSize: number;
  barcode: string | null;
  isVerified: boolean;
  categoryId: string | null;
  price: number;
  discountPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  ratingAverage: number;
  ratingCount: number;
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

export interface ChatMessage {
  id: string;
  orderId: string;
  senderUserId: string;
  fromShop: boolean;
  text: string;
  createdAt: string;
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
  entrance: string | null;
  floor: string | null;
  apartment: string | null;
  intercom: string | null;
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
  /** Joined on seller order views — first photo shown in the card/detail; also carries globalProductId for the "find elsewhere" suggestion flow. */
  productVariant?: { photos: string[]; globalProductId?: string } | null;
}

export type OrderStatus =
  | 'new'
  | 'accepted'
  | 'preparing'
  | 'delivering'
  | 'delivered'
  | 'cancelled'
  /** Shop never accepted it within the 5-minute window. Not the customer's fault — see the reorder/find-elsewhere suggestions on the order screen. */
  | 'seller_no_response'
  /** Shop explicitly declined before accepting. Same suggestion flow as seller_no_response. */
  | 'seller_rejected';

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
  paymentStatus: 'not_required' | 'pending' | 'paid' | 'failed';
  timeline: Array<{ status: OrderStatus; at: string; note?: string }>;
  createdAt: string;
  /** Optional free-text reason the customer added for returned items. */
  returnReason?: string | null;
  /** Variant IDs the current user has already reviewed for this order (from GET /orders/:id). */
  reviewedVariantIds?: string[];
  /** Seller-side: joined customer + address (present on /seller/shops/:id/orders). */
  user?: { id: string; name: string | null; phone: string } | null;
  deliveryAddress?: {
    address: string;
    latitude: number;
    longitude: number;
    entrance?: string | null;
    floor?: string | null;
    apartment?: string | null;
    intercom?: string | null;
  } | null;
  /** Snapshotted at order time — defaults to the customer's own phone but may be a different recipient. */
  recipientPhone?: string | null;
  /** Free-text note to the courier, entered at checkout. */
  courierComment?: string | null;
  /** ShopStaff.id this order is assigned to (e.g. delivering courier). */
  assignedStaffId?: string | null;
  /** 'delivery' (app order) or 'in_store' (counter sale). */
  channel?: 'delivery' | 'in_store';
  /** Customer dispute on this order, if any (from GET /orders/:id — SPEC.md §8.5, §21). */
  complaint?: {
    status: 'open' | 'resolved';
    reason: string;
    createdAt: string;
    resolvedAt: string | null;
  } | null;
  /** Admin force-refund applied to this order, if any (from GET /orders/:id). */
  refund?: { amount: number; at: string } | null;
}

/** FIFO cost summary attached to seller inventory rows. */
export interface VariantCost {
  avgCost: number;
  nextCost: number;
  stockValue: number;
}

/** A seller-side variant (GET /seller/.../variants) — variant + FIFO cost. */
export interface SellerVariant extends PublicProductVariant {
  lowStockThreshold: number;
  isActive: boolean;
  expiryDate: string | null;
  cost: VariantCost;
}

/** A single FIFO receiving lot. */
export interface StockBatch {
  id: string;
  productVariantId: string;
  costPrice: number;
  quantityReceived: number;
  quantityRemaining: number;
  expiryDate: string | null;
  supplierName: string | null;
  note: string | null;
  isReturn: boolean;
  receivedAt: string;
  createdAt: string;
}

/** Shared catalogue entry returned when scanning a known barcode. */
export interface GlobalProduct {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  unitType: UnitType;
  unitSize: number;
  categoryId: string | null;
  photos: string[];
  isVerified: boolean;
  usageCount: number;
  parentGlobalProductId: string | null;
}

export type MovementType = 'in' | 'sold' | 'returned' | 'expired' | 'adjusted' | 'damaged';

/** Mandatory reason codes for a "brak" (write-off) — SPEC.md §26.3. */
export type BrakReasonCode = 'expired' | 'damaged' | 'stolen' | 'other';

export interface InventoryMovement {
  id: string;
  productVariantId: string;
  type: MovementType;
  quantity: number;
  beforeStock: number;
  afterStock: number;
  reason: string | null;
  orderId: string | null;
  createdAt: string;
}

export type StatsPeriod = 'today' | '7d' | '30d';

export interface SellerStats {
  period: StatsPeriod;
  revenue: number;
  profit: number;
  orderCount: number;
  itemsSold: number;
  inventoryValue: number;
  topProducts: { name: string; qty: number; revenue: number }[];
}

export interface ReorderItem {
  variantId: string;
  name: string;
  stock: number;
  lowStockThreshold: number;
  soldLast30: number;
  perDay: number;
  daysLeft: number | null;
  suggestedQty: number;
  unitCost: number;
}

export interface ExpiringItem {
  batchId: string;
  variantId: string;
  name: string;
  quantityRemaining: number;
  costPrice: number;
  expiryDate: string;
  daysToExpiry: number;
}

/**
 * `GET /seller/shops/:shopId/products/expiring` (SPEC.md §26.2) — a variant
 * (not a batch) tagged with an urgency tier, mirroring the same tiers the
 * expiry-alert cron already pushes on: 🔴 expired, 🟠 critical, 🟡 warning.
 */
export interface ExpiringVariant extends PublicProductVariant {
  expiryDate: string;
  daysToExpiry: number;
  tier: 'expired' | 'critical' | 'warning';
}

/** `GET /seller/shops/:shopId/products/low-stock` (SPEC.md §30) — tiered like above. */
export interface LowStockVariant extends PublicProductVariant {
  tier: 'critical' | 'warning';
}

// ---- Qarz daftar (debt ledger) ----
export interface DebtAccount {
  customerName: string;
  customerPhone: string;
  totalDebt: number;
  totalPaid: number;
  balance: number;
  lastActivityAt: string;
}

export interface DebtLine {
  variantId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Debt {
  id: string;
  customerName: string;
  customerPhone: string;
  lines: DebtLine[];
  itemsTotal: number;
  extraCharge: number;
  total: number;
  note: string | null;
  stockDecremented: boolean;
  createdAt: string;
}

export interface DebtPayment {
  id: string;
  customerPhone: string;
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface DebtAccountDetail {
  customerName: string;
  customerPhone: string;
  totalDebt: number;
  totalPaid: number;
  balance: number;
  debts: Debt[];
  payments: DebtPayment[];
}

export interface DebtSummary {
  outstanding: number;
  customers: number;
}

// ---- Do'kon majburiyatlari (payables — do'konning tashqi kreditorlarga qarzlari) ----
export type PayableCategory = 'supplier' | 'rent' | 'utility' | 'loan' | 'salary' | 'other';

export interface PayableAccount {
  id: string;
  name: string;
  category: PayableCategory;
  phone: string | null;
  totalCharged: number;
  totalPaid: number;
  balance: number;
  lastActivityAt: string | null;
  nearestDueDate: string | null;
}

export interface SupplierAccount {
  id: string;
  shopId: string;
  name: string;
  category: PayableCategory;
  phone: string | null;
  note: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PayableCharge {
  id: string;
  shopId: string;
  accountId: string;
  amount: number;
  description: string | null;
  dueDate: string | null;
  note: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface PayablePayment {
  id: string;
  shopId: string;
  accountId: string;
  amount: number;
  note: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface PayableAccountDetail {
  account: SupplierAccount;
  totalCharged: number;
  totalPaid: number;
  balance: number;
  charges: PayableCharge[];
  payments: PayablePayment[];
}

export interface PayableSummary {
  outstanding: number;
  creditors: number;
  overdue: number;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  kind: string;
  isRead: boolean;
  createdAt: string;
}

export interface MyShop {
  id: string;
  name: string;
  address: string;
  photos: string[];
  isOpenManual: boolean;
  /** Count of NEW orders awaiting acceptance — shown as a badge on the profile. */
  newOrderCount: number;
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

export interface Promotion {
  id: string;
  shopId: string;
  name: string;
  type: 'product_discount' | 'category_discount' | 'free_delivery';
  discountType: 'percent' | 'fixed' | null;
  discountValue: number | null;
  targetProductId: string | null;
  targetCategoryId: string | null;
  freeDeliveryMinAmount: number | null;
  startAt: string;
  endAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ChatTemplate {
  id: string;
  shopId: string | null;
  text: string;
  isSystem: boolean;
  sortOrder: number;
  createdAt: string;
}

/**
 * One stop of `GET /seller/shops/:shopId/orders/delivery-route` (SPEC.md
 * §27), in nearest-neighbor visiting order — mirrors
 * orders.service.ts#getDeliveryRoute's return type exactly (there is no
 * `customerName` or `status` on the wire; all returned stops are already
 * `delivering`, and the seller's own staff list is the source of names).
 */
export interface DeliveryRouteStop {
  orderId: string;
  orderNumber: string;
  sequence: number;
  address: string;
  lat: number;
  lng: number;
  customerPhone: string | null;
  total: number;
  distanceFromPreviousKm: number;
}

export interface DeliveryRoute {
  shopLocation: { lat: number; lng: number };
  stops: DeliveryRouteStop[];
}

export interface ShopCompletenessItem {
  key: string;
  done: boolean;
  points: number;
  label: string;
}

export interface ShopCompleteness {
  score: number;
  maxScore: number;
  items: ShopCompletenessItem[];
}

export interface GlobalCatalogProduct {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  description: string | null;
  parentGlobalProductId: string | null;
  unitType: UnitType;
  unitSize: number;
  categoryId: string | null;
  photos: string[];
  isVerified: boolean;
  isActive: boolean;
  usageCount: number;
}

/** One shop's offer for the same GlobalProduct — used in price comparison. */
export interface ProductOffer {
  variantId: string;
  shopId: string;
  shopName: string;
  shopPhotos: string[];
  distanceKm: number | null;
  price: number;
  discountPrice: number | null;
  stock: number;
  isOpen: boolean;
}

/** A tokenized Click card saved for repeat "pay with card" checkouts (GET /click/cards). */
export interface SavedCard {
  id: string;
  cardNumberMasked: string | null;
  isDefault: boolean;
  status: 'pending_verify' | 'active';
}

/**
 * Translation key for each order status — pass to `tr()` (from
 * `useTranslation()`) rather than a hardcoded label, so the status text
 * follows the user's chosen language (uz/uz_cyrl/ru). Replaces the old
 * `STATUS_LABEL_UZ` hardcoded-Uzbek map.
 */
export const ORDER_STATUS_KEY: Record<OrderStatus, TranslationKey> = {
  new: 'orders.statusNew',
  accepted: 'orders.statusAccepted',
  preparing: 'orders.statusPreparing',
  delivering: 'orders.statusDelivering',
  delivered: 'orders.statusDelivered',
  cancelled: 'orders.statusCancelled',
  seller_no_response: 'orders.statusSellerNoResponse',
  seller_rejected: 'orders.statusSellerRejected',
};
