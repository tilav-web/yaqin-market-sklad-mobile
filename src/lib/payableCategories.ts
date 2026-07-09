import { Banknote, Building2, HandCoins, Package, Users, Zap } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import type { PayableCategory } from './types';

/** Ordered for the category picker UI. */
export const PAYABLE_CATEGORY_LIST: PayableCategory[] = [
  'supplier',
  'rent',
  'utility',
  'loan',
  'salary',
  'other',
];

export const PAYABLE_CATEGORY_LABELS: Record<PayableCategory, string> = {
  supplier: "Ta'minotchi",
  rent: 'Ijara',
  utility: 'Kommunal',
  loan: 'Kredit',
  salary: 'Ish haqi',
  other: 'Boshqa',
};

export const PAYABLE_CATEGORY_ICONS: Record<PayableCategory, LucideIcon> = {
  supplier: Package,
  rent: Building2,
  utility: Zap,
  loan: Banknote,
  salary: Users,
  other: HandCoins,
};
