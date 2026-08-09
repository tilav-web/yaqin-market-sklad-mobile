import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'ym_device_id';

// Cached in-process — every request would otherwise pay a SecureStore read.
// A correlation id, not a secret, so it's fine to keep in memory and it
// needs no uuid-format validation server-side. Cleared on reinstall
// (Android) — an accepted limitation for the anti-fraud signals that key
// off it (they're leads, not locks).
let cached: string | null = null;

function generateId(): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(16).slice(2).padEnd(16, '0').slice(0, 16);
  return `${time}-${random}`;
}

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) {
    cached = existing;
    return existing;
  }
  const id = generateId();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  cached = id;
  return id;
}
