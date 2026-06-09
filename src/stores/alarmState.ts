import { create } from 'zustand';

import { stopOrderAlarm } from '@/utils/alarm';

export interface PendingOrder {
  orderId: string;
  orderNumber: number;
}

interface AlarmState {
  pending: PendingOrder | null;
  setPending: (order: PendingOrder | null) => void;
  /** Called by the order-detail page on mount — stops alarm only for the matching order. */
  clearIfMatch: (orderId: string) => void;
}

export const useAlarmState = create<AlarmState>((set, get) => ({
  pending: null,
  setPending: (order) => set({ pending: order }),
  clearIfMatch: (orderId) => {
    if (get().pending?.orderId === orderId) {
      stopOrderAlarm();
      set({ pending: null });
    }
  },
}));
