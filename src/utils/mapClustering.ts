import { Region } from 'react-native-maps';

import { PublicShop } from '@/lib/types';

export type MapClusterItem =
  | { type: 'shop'; shop: PublicShop }
  | {
      type: 'cluster';
      id: string;
      latitude: number;
      longitude: number;
      count: number;
      shops: PublicShop[];
    };

/**
 * High performance spatial clustering for shops on MapView.
 * When viewing a city or neighborhood (latitudeDelta <= 0.12), every shop is rendered
 * individually with full fidelity — zero lag, zero grouping delay.
 * Only when zoomed far out (regional / country view) are overlapping shops clustered.
 */
export function clusterShops(
  shops: PublicShop[],
  region: Region | null,
  clusterThresholdDelta = 0.12,
): MapClusterItem[] {
  if (!shops.length) return [];

  // When zoomed in to city/neighborhood scale, show all individual shops directly
  if (!region || region.latitudeDelta <= clusterThresholdDelta) {
    return shops.map((shop) => ({ type: 'shop', shop }));
  }

  const { latitudeDelta, longitudeDelta } = region;

  // Filter valid shops (retain all shops to prevent pop-out / disappearance on pan)
  const validShops = shops.filter(
    (s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude),
  );

  // Divide into a stable coordinate grid
  const cellLatSize = latitudeDelta / 5;
  const cellLngSize = longitudeDelta / 5;

  const cells = new Map<string, PublicShop[]>();

  for (const shop of validShops) {
    const row = Math.floor(shop.latitude / cellLatSize);
    const col = Math.floor(shop.longitude / cellLngSize);
    const key = `${row}:${col}`;
    const list = cells.get(key);
    if (list) {
      list.push(shop);
    } else {
      cells.set(key, [shop]);
    }
  }

  const result: MapClusterItem[] = [];

  cells.forEach((cellShops, key) => {
    if (cellShops.length === 1) {
      result.push({ type: 'shop', shop: cellShops[0] });
    } else {
      let sumLat = 0;
      let sumLng = 0;
      for (const s of cellShops) {
        sumLat += s.latitude;
        sumLng += s.longitude;
      }
      result.push({
        type: 'cluster',
        id: `cluster-${key}-${cellShops.length}`,
        latitude: sumLat / cellShops.length,
        longitude: sumLng / cellShops.length,
        count: cellShops.length,
        shops: cellShops,
      });
    }
  });

  return result;
}
