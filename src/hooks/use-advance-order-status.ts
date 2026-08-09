import { useMutation } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { tr } from '@/i18n';
import { api } from '@/lib/api';
import { startCourierTracking, stopCourierTracking } from '@/lib/courier-location-task';
import { captureEvidence, distanceMeters, SOFT_WARNING_DISTANCE_M } from '@/lib/location-evidence';
import { Order, OrderStatus } from '@/lib/types';
import { haptics } from '@/utils/haptics';

export interface AdvanceOrderStatusArgs {
  orderId: string;
  status: OrderStatus;
  /** Only needed for the 'delivered' transition's distance check. */
  deliveryAddress?: Order['deliveryAddress'];
}

function confirmLocationShare(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      tr('sellerOrder.locationShareTitle'),
      tr('sellerOrder.locationShareBody'),
      [
        { text: tr('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
        { text: tr('sellerOrder.agree'), onPress: () => resolve(true) },
      ],
      { onDismiss: () => resolve(false) },
    );
  });
}

function confirmFarFromAddress(km: string): Promise<boolean> {
  return new Promise((resolve) => {
    haptics.warning();
    Alert.alert(
      tr('risk.farFromAddressTitle'),
      tr('risk.farFromAddressBody', { km }),
      [
        { text: tr('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
        { text: tr('risk.continueAnyway'), onPress: () => resolve(true) },
      ],
      { onDismiss: () => resolve(false) },
    );
  });
}

/**
 * Shared "advance this order's status" mutation for every seller screen that
 * has one (the orders list AND the order detail). Captures best-effort
 * location evidence at the two decisive transitions — courier dispatch and
 * delivered — and warns (never blocks) when "delivered" is confirmed far
 * from the saved address. Evidence is always sent, including when capture
 * failed (permission denied, timeout) — the server records that as "no
 * evidence" rather than staying silent about it.
 *
 * Starting courier tracking lives HERE, not in a screen effect, so it fires
 * no matter which screen the seller advances the order from — previously
 * advancing from the orders LIST never started tracking at all, because the
 * disclosure+start flow only lived in the detail screen's mount effect.
 */
export function useAdvanceOrderStatus(opts: { onSuccess?: () => void; onError?: (e: unknown) => void }) {
  return useMutation({
    mutationFn: async ({ orderId, status, deliveryAddress }: AdvanceOrderStatusArgs) => {
      if (status === 'delivering') {
        const evidence = await captureEvidence({ source: 'foreground' });
        const shouldTrack = await confirmLocationShare();
        if (shouldTrack) {
          const result = await startCourierTracking(orderId);
          if (!result.ok) {
            Alert.alert(tr('sellerOrder.locationPermTitle'), tr('sellerOrder.locationPermBody'));
          }
        }
        await api.patch(`/orders/${orderId}/status`, { status, evidence: evidence ?? undefined });
        return;
      }

      if (status === 'delivered') {
        const evidence = await captureEvidence({ source: 'foreground' });
        if (evidence && evidence.source !== 'last_known' && deliveryAddress) {
          const meters = distanceMeters(evidence, deliveryAddress);
          if (meters > SOFT_WARNING_DISTANCE_M) {
            const proceed = await confirmFarFromAddress((meters / 1000).toFixed(1));
            if (!proceed) return; // seller backed out — nothing submitted, order unchanged
          }
        }
        await api.patch(`/orders/${orderId}/status`, { status, evidence: evidence ?? undefined });
        await stopCourierTracking(orderId);
        return;
      }

      await api.patch(`/orders/${orderId}/status`, { status });
    },
    onSuccess: opts.onSuccess,
    onError: opts.onError,
  });
}
