import { useCallback, useEffect, useRef, useState } from 'react';

import { NewOrderEvent, useShopRealtime } from '@/lib/useShopRealtime';
import { useShopAlarm } from '@/stores/alarmSettings';
import { startOrderAlarm, stopOrderAlarm } from '@/utils/alarm';

export interface PendingOrder {
  orderId: string;
  orderNumber: number;
}

/**
 * Plays the new-order alarm for a shop and exposes the pending order so the UI
 * can show a "seen?" banner. In "long" mode the alarm rings until the seller
 * acknowledges (taps "Ko'rdim"); in "short" mode it plays a single alert but
 * the banner still stays until acknowledged.
 *
 * Mount this once for the whole seller shop section (the shop layout). It works
 * for the owner and any assigned staff — anyone whose device is joined to the
 * shop's realtime room.
 */
export function useOrderAlarm(shopId: string | undefined) {
  const alarm = useShopAlarm(shopId);
  const [pending, setPending] = useState<PendingOrder | null>(null);

  // Keep the latest settings without re-subscribing the socket on every change.
  const alarmRef = useRef(alarm);
  alarmRef.current = alarm;

  const onNewOrder = useCallback((order: NewOrderEvent) => {
    const a = alarmRef.current;
    if (!a.enabled) return;
    void startOrderAlarm(a.mode === 'long');
    setPending({ orderId: order.orderId, orderNumber: order.orderNumber });
  }, []);

  useShopRealtime(shopId, onNewOrder);

  const acknowledge = useCallback(() => {
    stopOrderAlarm();
    setPending(null);
  }, []);

  // Make sure the alarm never keeps ringing after leaving the seller section.
  useEffect(() => () => stopOrderAlarm(), []);

  return { pending, acknowledge, alarm };
}
