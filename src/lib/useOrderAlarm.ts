import { useCallback, useEffect, useRef } from 'react';

import { useAlarmState } from '@/stores/alarmState';
import { useShopAlarm } from '@/stores/alarmSettings';
import { startOrderAlarm, stopOrderAlarm } from '@/utils/alarm';
import { NewOrderEvent, useShopRealtime } from '@/lib/useShopRealtime';

export type { PendingOrder } from '@/stores/alarmState';

/**
 * Plays the new-order alarm for a shop and exposes the pending order so the UI
 * can show a banner.
 *
 * "short" mode: vibrates twice, banner can be dismissed with "Ko'rdim".
 * "long" mode: vibrates continuously — alarm stops ONLY when the seller
 * opens the specific order-detail page (not just by tapping "Ko'rdim").
 */
export function useOrderAlarm(shopId: string | undefined) {
  const alarm = useShopAlarm(shopId);
  const alarmRef = useRef(alarm);
  alarmRef.current = alarm;

  const pending = useAlarmState((s) => s.pending);
  const setPending = useAlarmState((s) => s.setPending);

  const onNewOrder = useCallback(
    (order: NewOrderEvent) => {
      const a = alarmRef.current;
      if (!a.enabled) return;
      startOrderAlarm(a.mode === 'long');
      setPending({ orderId: order.orderId, orderNumber: order.orderNumber });
    },
    [setPending],
  );

  useShopRealtime(shopId, onNewOrder);

  /**
   * Dismiss the banner.
   * - "short" mode: also stops the alarm (may have already stopped on its own).
   * - "long" mode: hides the banner but the alarm keeps ringing until the order
   *   detail page mounts and calls useAlarmState.clearIfMatch().
   */
  const acknowledge = useCallback(() => {
    const a = alarmRef.current;
    if (a.mode === 'short') stopOrderAlarm();
    setPending(null);
  }, [setPending]);

  // Safety net: stop vibration if the seller exits the whole seller section.
  useEffect(() => () => stopOrderAlarm(), []);

  return { pending, acknowledge, alarm };
}
