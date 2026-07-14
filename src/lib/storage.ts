import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'ym_access_token';
const REFRESH_TOKEN_KEY = 'ym_refresh_token';

export const tokenStorage = {
  async getAccess(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },
  async getRefresh(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },
  async save(accessToken: string, refreshToken: string): Promise<void> {
    const results = await Promise.allSettled([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    ]);
    if (results.some((r) => r.status === 'rejected')) {
      // Don't leave a half-written pair (e.g. a new access token alongside
      // the OLD refresh token) — wipe both so the app falls back to a clean
      // logged-out state instead of a subtly mismatched session.
      await Promise.allSettled([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      ]);
      throw new Error('Tokenlarni saqlashda xatolik yuz berdi');
    }
  },
  async clear(): Promise<void> {
    // allSettled, not all — a failed delete on one key must not stop the
    // logout flow (signOut() has no try/catch around this call) from
    // clearing app state just because the other key's delete threw.
    await Promise.allSettled([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  },
};
