import { useEffect, useRef, useState } from 'react';

import { getSocket } from './socket';
import type { CourierLocation } from './useOrderSocket';

/**
 * Same idea as useOrderSocket, but for every active order at once — joins
 * an `order:{id}` room per orderId and buckets incoming `courier:location`
 * events by their orderId, so the multi-order live-tracking map can show
 * every courier at the same time instead of just whichever order screen
 * happens to be open.
 */
export function useMultiOrderSocket(orderIds: string[]): Record<string, CourierLocation> {
  const [locations, setLocations] = useState<Record<string, CourierLocation>>({});
  const joinedRef = useRef<Set<string>>(new Set());
  // Stable key so the effect only re-runs when the actual set of ids changes,
  // not on every parent re-render with a new-but-equal array.
  const key = [...orderIds].sort().join(',');

  useEffect(() => {
    if (orderIds.length === 0) return;
    let cancelled = false;

    const onLocation = (data: CourierLocation) => {
      if (cancelled) return;
      setLocations((prev) => ({ ...prev, [data.orderId]: data }));
    };

    void getSocket().then((socket) => {
      if (cancelled) return;
      for (const id of orderIds) {
        if (!joinedRef.current.has(id)) {
          socket.emit('join:order', id);
          joinedRef.current.add(id);
        }
      }
      socket.on('courier:location', onLocation);
    });

    return () => {
      cancelled = true;
      void getSocket().then((socket) => {
        socket.off('courier:location', onLocation);
        for (const id of joinedRef.current) socket.emit('leave:order', id);
        joinedRef.current.clear();
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the intentional dep, orderIds itself changes identity every render
  }, [key]);

  return locations;
}
