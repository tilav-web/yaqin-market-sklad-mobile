import Supercluster, { PointFeature } from 'supercluster';
import type { BBox } from 'geojson';
import { Region } from 'react-native-maps';

import { PublicShop } from '@/lib/types';

export type MapClusterItem =
  | { type: 'shop'; shop: PublicShop }
  | {
      type: 'cluster';
      id: string;
      clusterId: number;
      latitude: number;
      longitude: number;
      count: number;
      expansionZoom: number;
      shops: PublicShop[];
    };

export interface ShopPointProperties {
  shop: PublicShop;
}

export type ClusterBBox = [number, number, number, number];

/**
 * Converts MapView Region to [minLng, minLat, maxLng, maxLat] bounding box
 * with a buffer margin so edge markers don't pop in/out when panning.
 */
export function regionToBBox(region: Region, bufferRatio: number = 0.35): ClusterBBox {
  const latDelta = region.latitudeDelta * (1 + bufferRatio);
  const lngDelta = region.longitudeDelta * (1 + bufferRatio);
  const minLng = Math.max(-180, region.longitude - lngDelta / 2);
  const maxLng = Math.min(180, region.longitude + lngDelta / 2);
  const minLat = Math.max(-85, region.latitude - latDelta / 2);
  const maxLat = Math.min(85, region.latitude + latDelta / 2);
  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Calculates zoom level (0 - 20) from longitudeDelta.
 */
export function regionToZoom(region: Region): number {
  if (region.longitudeDelta <= 0) return 16;
  const zoom = Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2);
  return Math.max(1, Math.min(20, zoom));
}

/**
 * High-performance spatial clustering using Mapbox Supercluster (K-D Tree).
 * Clusters 10,000+ points in < 1ms with automatic LOD (Level of Detail).
 */
export function createShopClusterIndex(shops: PublicShop[]) {
  const validShops = shops.filter(
    (s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude),
  );

  const index = new Supercluster<ShopPointProperties>({
    radius: 48,      // Cluster radius in pixels
    maxZoom: 16,     // Max zoom level to cluster points on
    minPoints: 2,    // Minimum points to form a cluster
  });

  const points: PointFeature<ShopPointProperties>[] = validShops.map((shop) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [shop.longitude, shop.latitude],
    },
    properties: {
      shop,
    },
  }));

  index.load(points);
  return index;
}

/**
 * Get visible cluster items for the current viewport region.
 */
export function getClustersForRegion(
  index: Supercluster<ShopPointProperties> | null,
  region: Region | null,
  fallbackShops: PublicShop[],
): MapClusterItem[] {
  if (!index || !region || fallbackShops.length === 0) {
    return fallbackShops.map((shop) => ({ type: 'shop', shop }));
  }

  // For standard user shopping view (neighborhood, district, city view <= 0.15),
  // or when total shop list is <= 60, show individual shop markers directly so
  // no numbers obscure the shop icons.
  if (fallbackShops.length <= 60 || region.latitudeDelta <= 0.15) {
    return fallbackShops.map((shop) => ({ type: 'shop', shop }));
  }

  try {
    const bbox = regionToBBox(region) as unknown as BBox;
    const zoom = regionToZoom(region);
    const rawClusters = index.getClusters(bbox, zoom);

    return rawClusters.map((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      const props = feature.properties as any;

      if (props?.cluster) {
        const clusterId = props.cluster_id as number;
        const count = props.point_count as number;
        const expansionZoom = index.getClusterExpansionZoom(clusterId);
        const leaves = index.getLeaves(clusterId, 50);
        const clusterShops = leaves.map((l) => (l.properties as ShopPointProperties).shop);

        return {
          type: 'cluster',
          id: `cluster-${clusterId}-${count}`,
          clusterId,
          latitude: lat,
          longitude: lng,
          count,
          expansionZoom,
          shops: clusterShops,
        };
      }

      return {
        type: 'shop',
        shop: (props as ShopPointProperties).shop,
      };
    });
  } catch {
    return fallbackShops.map((shop) => ({ type: 'shop', shop }));
  }
}
