import { LatLng } from 'react-native-maps';
import { GeoJsonPolygon } from '@/lib/types';

export type ZoneKey = 'delivery' | 'free';

export const SNAP_PX = 44; // pixels — auto-close snap radius

export function toGeoJson(verts: LatLng[]): GeoJsonPolygon {
  const ring = verts.map<[number, number]>((v) => [v.longitude, v.latitude]);
  ring.push(ring[0]);
  return { type: 'Polygon', coordinates: [ring] };
}

export function fromGeoJson(p: GeoJsonPolygon): LatLng[] {
  return p.coordinates[0].slice(0, -1).map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}
