import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getSocket } from '@/lib/socket';

/**
 * Subscribes the seller's device to a shop's order stream. Joins the
 * `shop:{shopId}` room and refreshes the seller order list whenever an order
 * is created or changes — so new orders appear without waiting for a poll.
 *
 * `onNewOrder` fires for incoming `order:new` events (e.g. to play a sound or
 * toast). Returns nothing; cleans up its listeners on unmount.
 */
export function useShopRealtime(shopId: string | undefined, onNewOrder?: () => void) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!shopId) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void getSocket().then((socket) => {
      if (cancelled) return;
      socket.emit('join:shop', shopId);

      const invalidate = () => {
        qc.invalidateQueries({ queryKey: ['seller-orders', shopId] });
      };
      const onNew = () => {
        invalidate();
        onNewOrder?.();
      };
      socket.on('order:new', onNew);
      socket.on('order:updated', invalidate);

      cleanup = () => {
        socket.emit('leave:shop', shopId);
        socket.off('order:new', onNew);
        socket.off('order:updated', invalidate);
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [shopId, qc, onNewOrder]);
}
