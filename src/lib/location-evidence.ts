import * as Location from 'expo-location';

export type EvidenceSource = 'foreground' | 'background' | 'last_known' | 'map_pick';

export interface LocationEvidencePayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt?: string;
  mocked?: boolean;
  source: EvidenceSource;
}

/**
 * Bordered so the "Yetkazildi" tap can never hang on a slow GPS fix — after
 * this it falls back to a last-known position (tagged accordingly) rather
 * than making the courier wait.
 */
const FIX_TIMEOUT_MS = 6000;
const LAST_KNOWN_MAX_AGE_MS = 60_000;

export function toEvidence(loc: Location.LocationObject, source: EvidenceSource): LocationEvidencePayload {
  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    accuracy: loc.coords.accuracy ?? undefined,
    capturedAt: new Date(loc.timestamp).toISOString(),
    mocked: loc.mocked,
    source,
  };
}

/**
 * Best-effort device fix for the anti-fraud evidence layer. NEVER throws and
 * NEVER prompts for permission — checks only, since asking mid-flow (e.g. at
 * the moment of tapping "Yetkazildi") gets reflexively denied under
 * pressure. Returns null when permission isn't already granted or every
 * attempt fails; callers must treat null as "no evidence", not an error.
 */
export async function captureEvidence(opts?: {
  source?: EvidenceSource;
  timeoutMs?: number;
}): Promise<LocationEvidencePayload | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const fix = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), opts?.timeoutMs ?? FIX_TIMEOUT_MS)),
    ]);
    if (fix) return toEvidence(fix, opts?.source ?? 'foreground');

    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS });
    if (lastKnown) return toEvidence(lastKnown, 'last_known');

    return null;
  } catch {
    return null;
  }
}

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine distance in metres — mirrors server/src/geo/geo.util.ts's haversineKm. */
export function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2) ** 2;
  const sinLon = Math.sin(dLon / 2) ** 2;
  const h = sinLat + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLon;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Deliberately larger than the server's `risk_delivered_max_distance_m`
 * default (300m) — the courier isn't nagged on borderline cases while the
 * server-side flag still records them. UX threshold, not policy; changing
 * it is a plain app update, not a settings round-trip.
 */
export const SOFT_WARNING_DISTANCE_M = 500;
