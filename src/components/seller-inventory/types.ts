import { tr } from '@/i18n';

export type Tab = 'all' | 'expiring' | 'lowStock';

export function unitLabel(unitType: string): string {
  switch (unitType) {
    case 'piece':
      return tr('inv.unitPiece');
    case 'kg':
      return tr('inv.unitKg');
    case 'liter':
      return tr('inv.unitLiter');
    case 'gram':
      return tr('inv.unitGram');
    case 'pack':
      return tr('inv.unitPack');
    default:
      return unitType;
  }
}

export function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}
