import { create } from 'zustand';

import { api, extractErrorMessage } from '@/lib/api';
import { unregisterPush } from '@/lib/push';
import { queryClient } from '@/lib/queryClient';
import { disconnectSocket, reconnectSocket } from '@/lib/socket';
import { tokenStorage } from '@/lib/storage';
import { useAlarmSettingsStore } from './alarmSettings';
import { useCartStore } from './cart';
import { useLocationStore } from './location';
import { useSearchHistoryStore } from './searchHistory';

export interface AuthUser {
  id: string;
  phone: string;
  name: string | null;
  avatarUrl: string | null;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  user: AuthUser | null;
  // 'offline': a stored token exists but /auth/me couldn't be verified due to
  // a network/server error (NOT a rejected token) — the session may still be
  // valid, so this is kept distinct from a genuine 'unauthenticated' and
  // should offer retry rather than acting like a logged-out guest.
  status: 'loading' | 'unauthenticated' | 'authenticated' | 'offline';
  requestOtp: (phone: string) => Promise<{ resendAfterSec: number; ttlSec: number }>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading',

  async hydrate() {
    const access = await tokenStorage.getAccess();
    if (!access) {
      set({ status: 'unauthenticated' });
      return;
    }
    try {
      const res = await api.get<AuthUser & { sub: string }>('/auth/me');
      set({
        user: {
          id: res.data.sub ?? res.data.id,
          phone: res.data.phone,
          name: null,
          avatarUrl: null,
        },
        status: 'authenticated',
      });
    } catch {
      // If refreshAccess() cleared the tokens (refresh token expired/revoked,
      // a definitive 401), the user must re-login. If it was a network/server
      // error, refreshAccess() deliberately left the tokens alone — the
      // session is still valid, connectivity is the problem, so don't force
      // this genuinely-still-logged-in user through the login screen.
      const stillHasToken = !!(await tokenStorage.getAccess());
      if (!stillHasToken) {
        set({ user: null, status: 'unauthenticated' });
        queryClient.clear();
      } else {
        set({ status: 'offline' });
      }
    }
  },

  async requestOtp(phone: string) {
    try {
      const res = await api.post<{ resendAfterSec: number; ttlSec: number }>(
        '/auth/request-otp',
        { phone },
      );
      return res.data;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async verifyOtp(phone: string, code: string) {
    try {
      const res = await api.post<{ user: AuthUser; tokens: AuthTokens }>('/auth/verify-otp', {
        phone,
        code,
      });
      await tokenStorage.save(res.data.tokens.accessToken, res.data.tokens.refreshToken);
      await reconnectSocket();
      set({ user: res.data.user, status: 'authenticated' });
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async signOut() {
    // Unlink the push token while the access token is still valid — after
    // tokenStorage.clear() the request would go out unauthenticated.
    await unregisterPush();
    await tokenStorage.clear();
    disconnectSocket();
    // Drop every cached query so the next user never sees the previous
    // account's orders, cart, debts, etc.
    queryClient.clear();
    // On a shared device, the next user must never inherit this account's
    // cart, saved delivery address, per-shop alarm prefs, or search history —
    // all persisted to AsyncStorage independently of the query cache.
    useCartStore.getState().clearAll();
    useLocationStore.getState().reset();
    useAlarmSettingsStore.getState().reset();
    useSearchHistoryStore.getState().clear();
    set({ user: null, status: 'unauthenticated' });
  },
}));
