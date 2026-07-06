import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { queryClient } from './queryClient';
import { tokenStorage } from './storage';

const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;

function inferDevApiUrl(): string {
  // Prefer explicit env var
  if (ENV_API_URL) return ENV_API_URL;
  // In dev client, infer host from Metro
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:3000`;
  }
  // Last resort: emulator default
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
}

export const API_URL = inferDevApiUrl();

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let refreshing: Promise<string | null> | null = null;

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    // Refresh on any 401 except the refresh call itself. NOTE: only exclude
    // `/auth/refresh` — excluding all of `/auth/` would skip `/auth/me`, so an
    // expired access token on app launch would log the user out instead of
    // silently refreshing (the 30-day refresh token stays unused).
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes('/auth/refresh')
    ) {
      original._retry = true;
      const newToken = await refreshAccess();
      if (newToken) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

async function refreshAccess(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const refreshToken = await tokenStorage.getRefresh();
      if (!refreshToken) return null;
      const res = await axios.post<{ accessToken: string; refreshToken: string }>(
        `${API_URL}/api/auth/refresh`,
        { refreshToken },
      );
      await tokenStorage.save(res.data.accessToken, res.data.refreshToken);
      // The access token silently rotated — re-authenticate the realtime socket
      // with it and reconnect, otherwise it keeps using the stale token until a
      // full re-login and realtime updates die silently in the background.
      // Dynamic import avoids a circular top-level import (socket.ts imports
      // API_URL from this module).
      const { reconnectSocket } = await import('./socket');
      void reconnectSocket();
      return res.data.accessToken;
    } catch (err) {
      // Only clear tokens when the server definitively rejects the refresh token
      // (401 = expired / revoked). Network errors or server 5xx must NOT log
      // the user out — the session is still valid, connectivity is the problem.
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        await tokenStorage.clear();
        // Refresh token is dead — this is a forced logout. Drop cached queries
        // and tear down the socket so the next login never flashes stale data.
        queryClient.clear();
        const { disconnectSocket } = await import('./socket');
        disconnectSocket();
      }
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
}

export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as ApiErrorBody | undefined;
    if (body?.message) {
      return Array.isArray(body.message) ? body.message.join(', ') : body.message;
    }
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Noma\'lum xatolik';
}

export type ApiRequestConfig = AxiosRequestConfig;

/**
 * Resolve a stored media value into a URL loadable from the CURRENT api host.
 *
 * Uploaded images are stored as host-independent paths (`/api/uploads/<key>`).
 * This also rewrites any legacy absolute URL that points at `/api/uploads/`
 * (e.g. an old `http://192.168.x.x:3000/...` or `http://localhost:3000/...`) to
 * the live host — so images keep loading after the app restarts or the network
 * changes. External URLs (category icons, etc.) pass through untouched.
 */
export function resolveMedia(value?: string | null): string | undefined {
  if (!value) return undefined;
  const marker = '/api/uploads/';
  const i = value.indexOf(marker);
  if (i >= 0) return `${API_URL}${value.slice(i)}`;
  return value;
}

/**
 * Upload a local image (a file:// URI from expo-image-picker) to the server and
 * return its public URL. The server stores it in MinIO and serves it back
 * through `/api/uploads/<key>`, so the returned URL is directly usable in
 * <Image>. Auth header is attached by the request interceptor.
 */
export async function uploadImage(uri: string): Promise<string> {
  const name = uri.split('/').pop() ?? `photo-${Date.now()}.jpg`;
  const extMatch = /\.(\w+)$/.exec(name);
  const ext = (extMatch?.[1] ?? 'jpg').toLowerCase();
  const MIME: Record<string, string> = { png: 'image/png', webp: 'image/webp' };
  const mime = MIME[ext] ?? 'image/jpeg';
  const form = new FormData();
  // React Native FormData file shape
  form.append('file', { uri, name, type: mime } as unknown as Blob);
  const res = await api.post<{ url: string }>('/uploads/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.url;
}
