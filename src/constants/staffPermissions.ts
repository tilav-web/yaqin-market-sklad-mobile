export type StaffPreset = 'kassir' | 'menejer' | 'sklad' | 'yetkazib_beruvchi' | 'custom';

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
];
