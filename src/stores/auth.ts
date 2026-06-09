import { create } from 'zustand';

import { api, extractErrorMessage } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { disconnectSocket, reconnectSocket } from '@/lib/socket';
import { tokenStorage } from '@/lib/storage';

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
  status: 'loading' | 'unauthenticated' | 'authenticated';
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
      // If refreshAccess() cleared the tokens (refresh token expired/revoked),
      // the user must re-login. If it was a network/server error, tokens are
      // still valid — don't wipe them, just show as unauthenticated until retry.
      const stillHasToken = !!(await tokenStorage.getAccess());
      if (!stillHasToken) {
        set({ user: null, status: 'unauthenticated' });
      } else {
        set({ status: 'unauthenticated' });
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
    await tokenStorage.clear();
    disconnectSocket();
    // Drop every cached query so the next user never sees the previous
    // account's orders, cart, debts, etc.
    queryClient.clear();
    set({ user: null, status: 'unauthenticated' });
  },
}));
