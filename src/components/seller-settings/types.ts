import { tr } from '@/i18n';

export type Pricing = 'flat' | 'per_km' | 'per_500m' | 'per_100m';

/** Mirror of the server's calcDeliveryFee (geo.util.ts) for the live preview. */
export function calcFee(distanceKm: number, freeKm: number, type: Pricing, pricePerStep: number): number {
  if (distanceKm <= freeKm) return 0;
  const overKm = distanceKm - freeKm;
  switch (type) {
    case 'flat':
      return pricePerStep;
    case 'per_km':
      return Math.ceil(overKm) * pricePerStep;
    case 'per_500m':
      return Math.ceil(overKm * 2) * pricePerStep;
    case 'per_100m':
      return Math.ceil(overKm * 10) * pricePerStep;
    default:
      return pricePerStep;
  }
}

export function pricingMeta(type: Pricing): { label: string; priceLabel: string; hint: string } {
  switch (type) {
    case 'per_km':
      return {
        label: tr('shopSet.perKm'),
        priceLabel: tr('shopSet.perKmPrice'),
        hint: tr('shopSet.perKmHint'),
      };
    case 'per_500m':
      return {
        label: tr('shopSet.per500m'),
        priceLabel: tr('shopSet.per500mPrice'),
        hint: tr('shopSet.per500mHint'),
      };
    case 'per_100m':
      return {
        label: tr('shopSet.per100m'),
        priceLabel: tr('shopSet.per100mPrice'),
        hint: tr('shopSet.per100mHint'),
      };
    case 'flat':
    default:
      return {
        label: tr('shopSet.flat'),
        priceLabel: tr('shopSet.flatPrice'),
        hint: tr('shopSet.flatHint'),
      };
  }
}

export function fmtSom(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}
