import { Banknote, Building2, HandCoins, Package, Users, Zap } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import type { TranslationKey } from '@/i18n';

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

/**
 * Translation keys rather than text: this map lives at module scope, so baking
 * in a language here would freeze the category names to whatever they were at
 * import time. Call sites resolve them with `tr()` while rendering.
 */
export const PAYABLE_CATEGORY_LABEL_KEYS: Record<PayableCategory, TranslationKey> = {
  supplier: 'payableCat.supplier',
  rent: 'payableCat.rent',
  utility: 'payableCat.utility',
  loan: 'payableCat.loan',
  salary: 'payableCat.salary',
  other: 'payableCat.other',
};

export const PAYABLE_CATEGORY_ICONS: Record<PayableCategory, LucideIcon> = {
  supplier: Package,
  rent: Building2,
  utility: Zap,
  loan: Banknote,
  salary: Users,
  other: HandCoins,
};
