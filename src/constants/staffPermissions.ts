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

export const PRESETS: { key: Exclude<StaffPreset, 'custom'>; label: string }[] = [
  { key: 'kassir', label: 'Kassir' },
  { key: 'menejer', label: 'Menejer' },
  { key: 'sklad', label: 'Sklad' },
  { key: 'yetkazib_beruvchi', label: 'Yetkazuvchi' },
];

export const PRESET_LABELS: Record<StaffPreset, string> = {
  kassir: 'Kassir',
  menejer: 'Menejer',
  sklad: 'Sklad',
  yetkazib_beruvchi: 'Yetkazuvchi',
  custom: 'Maxsus',
};

export const PERMISSION_GROUPS: { title: string; items: { key: string; label: string }[] }[] = [
  {
    title: 'Buyurtmalar',
    items: [
      { key: 'orders.view_all', label: 'Barcha buyurtmalarni ko‘rish' },
      { key: 'orders.view_assigned', label: 'Faqat o‘ziga tegishlini ko‘rish' },
      { key: 'orders.accept', label: 'Buyurtmani qabul qilish' },
      { key: 'orders.update_status', label: 'Holatini o‘zgartirish' },
      { key: 'orders.cancel', label: 'Bekor qilish' },
      { key: 'orders.chat', label: 'Mijoz bilan chat' },
      { key: 'orders.view_customer_contact', label: 'Mijoz kontaktini ko‘rish' },
    ],
  },
  {
    title: 'Sklad',
    items: [
      { key: 'inventory.view', label: 'Skladni ko‘rish' },
      { key: 'inventory.product.create', label: 'Mahsulot qo‘shish' },
      { key: 'inventory.product.edit_info', label: 'Ma’lumotini tahrirlash' },
      { key: 'inventory.product.edit_price', label: 'Narxini tahrirlash' },
      { key: 'inventory.product.edit_stock', label: 'Stokni tahrirlash' },
      { key: 'inventory.receive', label: 'Kirim qilish (tovar qabul)' },
      { key: 'inventory.count', label: 'Inventarizatsiya' },
      { key: 'inventory.movement.view', label: 'Harakatlar tarixi' },
      { key: 'inventory.low_stock_alerts', label: 'Kam qoldi ogohlantirishi' },
      { key: 'inventory.barcode.scan', label: 'Shtrix-kod skanerlash' },
    ],
  },
  {
    title: 'Sotuv',
    items: [{ key: 'sales.instore', label: 'Do‘konda sotish (kassa)' }],
  },
  {
    title: 'Qarz daftar',
    items: [{ key: 'debt.manage', label: 'Qarz yozish va to‘lov qabul qilish' }],
  },
  {
    title: 'Kontragent qarzlari',
    items: [{ key: 'payables.manage', label: 'Ta’minotchi/ijara qarzlarini boshqarish' }],
  },
  {
    title: 'Do‘kon',
    items: [
      { key: 'shop.toggle_open', label: 'Ochiq/yopiq qilish' },
      { key: 'shop.settings.view', label: 'Sozlamalarni ko‘rish' },
    ],
  },
  {
    title: 'Sharhlar',
    items: [{ key: 'reviews.view', label: 'Sharhlarni ko‘rish' }],
  },
  {
    title: 'Aksiyalar',
    items: [
      { key: 'promotions.view', label: 'Aksiyalarni ko‘rish' },
      { key: 'promotions.manage', label: 'Aksiya yaratish va boshqarish' },
    ],
  },
];
