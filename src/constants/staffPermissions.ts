import type { TranslationKey } from '@/i18n/translations';

export type StaffPreset = 'kassir' | 'menejer' | 'sklad' | 'yetkazib_beruvchi' | 'custom';

/**
 * Mirror of the server's `ALL_STAFF_PERMISSIONS`
 * (../../../server/src/shops/entities/shop-staff.entity.ts) — keep in sync.
 * The server is the actual source of truth/enforcement (via
 * `assertShopPermission`); this list only drives what the client shows.
 */
export const ALL_STAFF_PERMISSIONS = [
  // inventory
  'inventory.view',
  'inventory.product.create',
  'inventory.product.edit_info',
  'inventory.product.edit_price',
  'inventory.product.edit_stock',
  'inventory.receive',
  'inventory.count',
  'inventory.movement.view',
  'inventory.low_stock_alerts',
  'inventory.barcode.scan',
  // sales (in-store POS)
  'sales.instore',
  // orders
  'orders.view_all',
  'orders.view_assigned',
  'orders.accept',
  'orders.update_status',
  'orders.cancel',
  'orders.chat',
  'orders.view_customer_contact',
  // shop (limited)
  'shop.toggle_open',
  'shop.settings.view',
  // debt ledger (qarz daftar)
  'debt.manage',
  // payables — shop's own debts to external creditors (ta'minotchi/ijara/kredit)
  'payables.manage',
  // reviews
  'reviews.view',
  // promotions
  'promotions.view',
  'promotions.manage',
] as const;

export type StaffPermission = (typeof ALL_STAFF_PERMISSIONS)[number];

/** Mirror of the server's `PRESET_PERMISSIONS` — kept for parity/reference; the
 * server (shops.service.ts#updateStaff) is what actually applies these when a
 * preset is selected, this isn't re-sent by the client. */
export const PRESET_PERMISSIONS: Record<Exclude<StaffPreset, 'custom'>, StaffPermission[]> = {
  kassir: [
    'inventory.view',
    'inventory.product.edit_stock',
    'inventory.barcode.scan',
    'sales.instore',
    'orders.view_all',
    'orders.accept',
    'orders.update_status',
    'orders.chat',
    'orders.view_customer_contact',
    'debt.manage',
  ],
  menejer: [
    'inventory.view',
    'inventory.product.create',
    'inventory.product.edit_info',
    'inventory.product.edit_price',
    'inventory.product.edit_stock',
    'inventory.receive',
    'inventory.count',
    'inventory.movement.view',
    'inventory.low_stock_alerts',
    'inventory.barcode.scan',
    'sales.instore',
    'orders.view_all',
    'orders.accept',
    'orders.update_status',
    'orders.cancel',
    'orders.chat',
    'orders.view_customer_contact',
    'reviews.view',
    'shop.toggle_open',
    'shop.settings.view',
    'debt.manage',
    'payables.manage',
    'promotions.view',
    'promotions.manage',
  ],
  sklad: [
    'inventory.view',
    'inventory.product.create',
    'inventory.product.edit_info',
    'inventory.product.edit_stock',
    'inventory.receive',
    'inventory.count',
    'inventory.movement.view',
    'inventory.low_stock_alerts',
    'inventory.barcode.scan',
  ],
  yetkazib_beruvchi: [
    'orders.view_assigned',
    'orders.update_status',
    'orders.chat',
    'orders.view_customer_contact',
  ],
};

export interface StaffMember {
  id: string;
  userId: string;
  name: string | null;
  phone: string;
  customRoleName: string;
  preset: StaffPreset;
  permissions: string[];
  isActive: boolean;
}

export const PRESETS: { key: Exclude<StaffPreset, 'custom'>; labelKey: TranslationKey }[] = [
  { key: 'kassir', labelKey: 'perm.preset.kassir' },
  { key: 'menejer', labelKey: 'perm.preset.menejer' },
  { key: 'sklad', labelKey: 'perm.preset.sklad' },
  { key: 'yetkazib_beruvchi', labelKey: 'perm.preset.yetkazibBeruvchi' },
];

export const PRESET_LABEL_KEYS: Record<StaffPreset, TranslationKey> = {
  kassir: 'perm.preset.kassir',
  menejer: 'perm.preset.menejer',
  sklad: 'perm.preset.sklad',
  yetkazib_beruvchi: 'perm.preset.yetkazibBeruvchi',
  custom: 'perm.preset.custom',
};

export const PERMISSION_GROUPS: {
  titleKey: TranslationKey;
  items: { key: string; labelKey: TranslationKey }[];
}[] = [
  {
    titleKey: 'perm.group.orders',
    items: [
      { key: 'orders.view_all', labelKey: 'perm.orders.viewAll' },
      { key: 'orders.view_assigned', labelKey: 'perm.orders.viewAssigned' },
      { key: 'orders.accept', labelKey: 'perm.orders.accept' },
      { key: 'orders.update_status', labelKey: 'perm.orders.updateStatus' },
      { key: 'orders.cancel', labelKey: 'perm.orders.cancel' },
      { key: 'orders.chat', labelKey: 'perm.orders.chat' },
      { key: 'orders.view_customer_contact', labelKey: 'perm.orders.viewCustomerContact' },
    ],
  },
  {
    titleKey: 'perm.group.inventory',
    items: [
      { key: 'inventory.view', labelKey: 'perm.inventory.view' },
      { key: 'inventory.product.create', labelKey: 'perm.inventory.productCreate' },
      { key: 'inventory.product.edit_info', labelKey: 'perm.inventory.productEditInfo' },
      { key: 'inventory.product.edit_price', labelKey: 'perm.inventory.productEditPrice' },
      { key: 'inventory.product.edit_stock', labelKey: 'perm.inventory.productEditStock' },
      { key: 'inventory.receive', labelKey: 'perm.inventory.receive' },
      { key: 'inventory.count', labelKey: 'perm.inventory.count' },
      { key: 'inventory.movement.view', labelKey: 'perm.inventory.movementView' },
      { key: 'inventory.low_stock_alerts', labelKey: 'perm.inventory.lowStockAlerts' },
      { key: 'inventory.barcode.scan', labelKey: 'perm.inventory.barcodeScan' },
    ],
  },
  {
    titleKey: 'perm.group.sales',
    items: [{ key: 'sales.instore', labelKey: 'perm.sales.instore' }],
  },
  {
    titleKey: 'perm.group.debt',
    items: [{ key: 'debt.manage', labelKey: 'perm.debt.manage' }],
  },
  {
    titleKey: 'perm.group.payables',
    items: [{ key: 'payables.manage', labelKey: 'perm.payables.manage' }],
  },
  {
    titleKey: 'perm.group.shop',
    items: [
      { key: 'shop.toggle_open', labelKey: 'perm.shop.toggleOpen' },
      { key: 'shop.settings.view', labelKey: 'perm.shop.settingsView' },
    ],
  },
  {
    titleKey: 'perm.group.reviews',
    items: [{ key: 'reviews.view', labelKey: 'perm.reviews.view' }],
  },
  {
    titleKey: 'perm.group.promotions',
    items: [
      { key: 'promotions.view', labelKey: 'perm.promotions.view' },
      { key: 'promotions.manage', labelKey: 'perm.promotions.manage' },
    ],
  },
];
