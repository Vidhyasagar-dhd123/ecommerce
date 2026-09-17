import axios, { type InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '@/features/auth/utils/tokenStorage';
import { BASE_URL } from '@/constants/production_const';

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// ── Request interceptor: attach Bearer token ──────────────
axiosInstance.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Concurrent Refresh State & Mutex Queue ───────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ── Response interceptor: silent token refresh on 401 ─────
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Check if error is 401 and request hasn't been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If we are already refreshing, queue this request until refresh finishes
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refresh = tokenStorage.getRefreshToken();
        if (!refresh) {
          throw new Error('No refresh token available');
        }

        // Backend response envelope: { success: true, data: { access: string, refresh?: string }, errors: null }
        const { data } = await axios.post<{
          success: boolean;
          data: { access: string; refresh?: string } | null;
          errors: unknown;
        }>(`${BASE_URL}/api/v1/auth/login/refresh/`, { refresh });

        const newAccess = data.data?.access;
        const newRefresh = data.data?.refresh;

        if (!newAccess) {
          throw new Error('No access token received from refresh endpoint');
        }

        // Crucial: update BOTH the access token and the newly rotated refresh token
        tokenStorage.updateTokens(newAccess, newRefresh);

        // Resume and retry all queued requests
        processQueue(null, newAccess);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return axiosInstance(originalRequest);
      } catch (refreshError: any) {
        processQueue(refreshError, null);

        // Only clear storage and redirect if the refresh token is truly invalid/blacklisted (HTTP 401)
        // Avoid logging out on transient network errors or temporary 429 rate limits
        const status = refreshError?.response?.status;
        if (status === 401 || !tokenStorage.getRefreshToken()) {
          tokenStorage.clear();
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);