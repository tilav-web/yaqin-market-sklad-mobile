import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useToast } from '@/components/ui';
import { STATUS_LABEL_UZ } from '@/lib/types';
import type { OrderStatus } from '@/lib/types';
import { registerForPush } from '@/lib/push';
import { getSocket } from '@/lib/socket';

interface OrderEvent {
  orderId: string;
  status: OrderStatus;
  orderNumber: string;
  shopId: string;
}

/**
 * Invisible component, mounted once for authenticated users. Subscribes to the
 * realtime gateway and keeps React Query caches fresh as orders change, so any
 * open order/list screen updates live instead of waiting for a poll.
 */
export function RealtimeBridge() {
  const qc = useQueryClient();
  const toast = useToast();

  // Register this device for push once, on mount (authenticated).
  useEffect(() => {
    void registerForPush();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void getSocket().then((socket) => {
      if (cancelled) return;

      const refresh = (e: OrderEvent) => {
        qc.invalidateQueries({ queryKey: ['order', e.orderId] });
        qc.invalidateQueries({ queryKey: ['orders'] });
      };
      const onUpdated = (e: OrderEvent) => {
        refresh(e);
        toast.show(`#${e.orderNumber}: ${STATUS_LABEL_UZ[e.status]}`, { variant: 'info' });
      };
      const onNew = (e: OrderEvent) => refresh(e);

      socket.on('order:updated', onUpdated);
      socket.on('order:new', onNew);
      cleanup = () => {
        socket.off('order:updated', onUpdated);
        socket.off('order:new', onNew);
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [qc, toast]);

  return null;
}
