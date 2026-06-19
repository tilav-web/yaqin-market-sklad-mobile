import { useEffect, useRef, useState } from 'react';

import { getSocket } from './socket';

export interface CourierLocation {
  lat: number;
  lng: number;
  updatedAt: string;
}

/**
 * Subscribes to real-time courier location for a given orderId.
 * Emits `join:order` on mount and listens for `courier:location` events.
 * Returns null until the first location arrives.
 */
export function useOrderSocket(orderId: string | undefined) {
  const [courierLocation, setCourierLocation] = useState<CourierLocation | null>(null);
  const joined = useRef(false);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    void getSocket().then((socket) => {
      if (cancelled) return;
      if (!joined.current) {
        socket.emit('join:order', orderId);
        joined.current = true;
      }
      socket.on('courier:location', (data: CourierLocation) => {
        if (!cancelled) setCourierLocation(data);
      });
    });

    return () => {
      cancelled = true;
      joined.current = false;
      void getSocket().then((socket) => {
        socket.off('courier:location');
      });
    };
  }, [orderId]);

  return { courierLocation };
}
