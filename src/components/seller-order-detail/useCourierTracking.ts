import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { tr } from '@/i18n';
import { isTrackingOrder, startCourierTracking, stopCourierTracking } from '@/lib/courier-location-task';
import { OrderStatus } from '@/lib/types';

/**
 * Mirrors (resumes) live location reporting to match the order's status —
 * the actual START happens once, in useAdvanceOrderStatus, at the moment
 * the seller taps "Kuryerga berish" (from EITHER this screen or the orders
 * list). This hook no longer starts tracking or shows the disclosure Alert
 * on its own — it only checks whether tracking is currently active and, if
 * the order is `delivering` but tracking somehow isn't running (background
 * task killed, permission revoked mid-delivery, or advanced from a build
 * that predates this), exposes `enable()` for a banner to offer resuming it
 * instead of silently doing nothing.
 */
export function useCourierTracking(orderId: string | undefined, status: OrderStatus | undefined) {
  const [isTracking, setIsTracking] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!orderId || !status) return;
    let cancelled = false;

    if (status !== 'delivering') {
      void stopCourierTracking(orderId).then(() => {
        if (cancelled) return;
        setIsTracking(false);
        setChecked(true);
      });
      return () => {
        cancelled = true;
      };
    }

    void isTrackingOrder(orderId).then((already) => {
      if (cancelled) return;
      setIsTracking(already);
      setChecked(true);
    });

    return () => {
      cancelled = true;
    };
  }, [orderId, status]);

  const enable = () => {
    if (!orderId) return;
    Alert.alert(
      tr('sellerOrder.locationShareTitle'),
      tr('sellerOrder.locationShareBody'),
      [
        { text: tr('common.cancel'), style: 'cancel' },
        {
          text: tr('sellerOrder.agree'),
          onPress: () => {
            void startCourierTracking(orderId).then((result) => {
              if (result.ok) {
                setIsTracking(true);
              } else {
                Alert.alert(tr('sellerOrder.locationPermTitle'), tr('sellerOrder.locationPermBody'));
              }
            });
          },
        },
      ],
    );
  };

  return { isTracking, needsEnable: checked && status === 'delivering' && !isTracking, enable };
}
