import { useEffect, useRef, useState } from 'react';

import { getSocket } from './socket';

export interface CourierLocation {
  orderId: string;
  lat: number;
  lng: number;
  etaMinutes: number | null;
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
    // Named reference so cleanup removes only THIS hook's listener —
    // `.off('courier:location')` with no handler wipes every listener for that
    // event on the shared socket singleton, including other mounted screens'.
    // Filtered by orderId too: the socket may be joined to more than one
    // order room at once (e.g. this screen plus the multi-order tracking
    // screen both mounted), and every joined room's events land on the same
    // listener — without the filter a location update for a different order
    // would overwrite this one's state.
    const onLocation = (data: CourierLocation) => {
      if (!cancelled && data.orderId === orderId) setCourierLocation(data);
    };

    void getSocket().then((socket) => {
      if (cancelled) return;
      if (!joined.current) {
        socket.emit('join:order', orderId);
        joined.current = true;
      }
      socket.on('courier:location', onLocation);
    });

    return () => {
      cancelled = true;
      joined.current = false;
      void getSocket().then((socket) => {
        socket.off('courier:location', onLocation);
        socket.emit('leave:order', orderId);
      });
    };
  }, [orderId]);

  return { courierLocation };
}
