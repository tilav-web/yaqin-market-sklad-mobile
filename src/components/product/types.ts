import { tr as trStatic } from '@/i18n';
import { PublicProductVariant } from '@/lib/types';

export const UNIT_SHORT = (u: PublicProductVariant['unitType']): string =>
  u === 'piece'
    ? trStatic('prodDet.unitPiece')
    : ({ kg: 'kg', liter: 'L', gram: 'g', pack: 'pack' } as const)[u];

export const unitLabel = (v: Pick<PublicProductVariant, 'unitSize' | 'unitType'>) =>
  `${v.unitSize % 1 === 0 ? v.unitSize : v.unitSize.toFixed(1)} ${UNIT_SHORT(v.unitType)}`;
