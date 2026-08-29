import type { TranslationKey } from '@/i18n/translations';

export type StaffRole = 'cashier' | 'storekeeper' | 'courier' | 'manager' | 'custom';
export type StaffPreset = StaffRole | 'kassir' | 'sklad' | 'yetkazib_beruvchi' | 'menejer' | 'omborchi' | 'kuryer';

/**
 * Mirror of the server's `ALL_STAFF_PERMISSIONS`
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

export const ROLE_PERMISSIONS: Record<'cashier' | 'storekeeper' | 'courier' | 'manager', StaffPermission[]> = {
  cashier: [
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
  storekeeper: [
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
  courier: [
    'orders.view_assigned',
    'orders.update_status',
    'orders.chat',
    'orders.view_customer_contact',
  ],
  manager: [
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
};

export const PRESET_PERMISSIONS: Record<string, StaffPermission[]> = {
  ...ROLE_PERMISSIONS,
  kassir: ROLE_PERMISSIONS.cashier,
  sklad: ROLE_PERMISSIONS.storekeeper,
  omborchi: ROLE_PERMISSIONS.storekeeper,
  yetkazib_beruvchi: ROLE_PERMISSIONS.courier,
  kuryer: ROLE_PERMISSIONS.courier,
  menejer: ROLE_PERMISSIONS.manager,
};

export function computePermissionsForRoles(
  roles: (StaffRole | string)[],
  customPerms: StaffPermission[] = [],
): StaffPermission[] {
  const permSet = new Set<StaffPermission>(customPerms);
  for (const role of roles) {
    const perms = PRESET_PERMISSIONS[role] || ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
    if (perms) {
      for (const p of perms) {
        permSet.add(p);
      }
    }
  }
  return Array.from(permSet);
}

export interface StaffMember {
  id: string;
  userId: string;
  name: string | null;
  phone: string;
  customRoleName: string;
  preset: StaffPreset;
  roles?: StaffRole[];
  permissions: string[];
  isActive: boolean;
}

export interface RoleOption {
  key: 'cashier' | 'storekeeper' | 'courier' | 'manager';
  icon: string;
  badge: string;
  titleUz: string;
  titleRu: string;
  titleKr: string;
  descUz: string;
  descRu: string;
  descKr: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  {
    key: 'cashier',
    icon: 'credit-card',
    badge: '💳',
    titleUz: 'Kassir',
    titleRu: 'Кассир',
    titleKr: 'Кассир',
    descUz: 'Kassa (POS), shtrix-kod skaner, sotuv va qarz daftari',
    descRu: 'Касса (POS), сканер штрих-кодов, прием оплат и долги',
    descKr: 'Касса (POS), штрих-код сканер, сотув ва қарз дафтари',
  },
  {
    key: 'storekeeper',
    icon: 'package',
    badge: '📦',
    titleUz: 'Omborchi',
    titleRu: 'Кладовщик',
    titleKr: 'Омборчи',
    descUz: 'Kirim qilish, qoldiqlar sanog\'i va Excel import',
    descRu: 'Приемка товара, контроль остатков и Excel',
    descKr: 'Кирим қилиш, қолдиқлар саноғи ва Excel импорт',
  },
  {
    key: 'courier',
    icon: 'bike',
    badge: '🛵',
    titleUz: 'Kuryer',
    titleRu: 'Курьер',
    titleKr: 'Курьер',
    descUz: 'Buyurtmani xaridorga yetkazish va xarita',
    descRu: 'Доставка заказов клиентам и карта',
    descKr: 'Буюртмани харидорга етказиш ва харита',
  },
  {
    key: 'manager',
    icon: 'briefcase',
    badge: '💼',
    titleUz: 'Menejer',
    titleRu: 'Менеджер',
    titleKr: 'Менежер',
    descUz: 'Do\'kon tovarlari, aksiyalar va operatsion boshqaruv',
    descRu: 'Управление магазином, товары и акции',
    descKr: 'Дўкон товарлари, акциялар ва бошқарув',
  },
];

export const SMALL_SHOP_SHORTCUTS = [
  {
    id: 'universal_helper',
    labelUz: 'Kichik do\'kon yordamchisi',
    labelRu: 'Универсальный помощник',
    labelKr: 'Кичик дўкон ёрдамчиси',
    subUz: 'Kassir + Omborchi',
    subRu: 'Кассир + Кладовщик',
    subKr: 'Кассир + Омборчи',
    roles: ['cashier', 'storekeeper'] as StaffRole[],
  },
  {
    id: 'only_courier',
    labelUz: 'Faqat Kuryer',
    labelRu: 'Только Курьер',
    labelKr: 'Фақат Курьер',
    subUz: 'Yetkazib berish',
    subRu: 'Доставка',
    subKr: 'Етказиб бериш',
    roles: ['courier'] as StaffRole[],
  },
  {
    id: 'only_cashier',
    labelUz: 'Faqat Kassir',
    labelRu: 'Только Кассир',
    labelKr: 'Фақат Кассир',
    subUz: 'Kassa & Sotuv',
    subRu: 'Касса и продажи',
    subKr: 'Касса & Сотув',
    roles: ['cashier'] as StaffRole[],
  },
  {
    id: 'full_manager',
    labelUz: 'Katta Menejer',
    labelRu: 'Главный Менеджер',
    labelKr: 'Катта Менежер',
    subUz: 'Hamma operatsiyalar',
    subRu: 'Все операции',
    subKr: 'Ҳамма операциялар',
    roles: ['manager'] as StaffRole[],
  },
];

export const PRESETS: { key: Exclude<StaffPreset, 'custom'>; labelKey: TranslationKey }[] = [
  { key: 'cashier', labelKey: 'perm.preset.kassir' },
  { key: 'storekeeper', labelKey: 'perm.preset.sklad' },
  { key: 'courier', labelKey: 'perm.preset.yetkazibBeruvchi' },
  { key: 'manager', labelKey: 'perm.preset.menejer' },
];

export const PRESET_LABEL_KEYS: Record<StaffPreset, TranslationKey> = {
  cashier: 'perm.preset.kassir',
  storekeeper: 'perm.preset.sklad',
  courier: 'perm.preset.yetkazibBeruvchi',
  manager: 'perm.preset.menejer',
  kassir: 'perm.preset.kassir',
  menejer: 'perm.preset.menejer',
  sklad: 'perm.preset.sklad',
  yetkazib_beruvchi: 'perm.preset.yetkazibBeruvchi',
  omborchi: 'perm.preset.sklad',
  kuryer: 'perm.preset.yetkazibBeruvchi',
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
