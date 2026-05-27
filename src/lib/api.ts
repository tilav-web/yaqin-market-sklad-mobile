import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { tokenStorage } from './storage';

const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;

function inferDevApiUrl(): string {
  // Prefer explicit env var
  if (ENV_API_URL) return ENV_API_URL;
  // In dev client, infer host from Metro
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.hostUri;
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
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes('/auth/')
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
      return res.data.accessToken;
    } catch {
      await tokenStorage.clear();
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
