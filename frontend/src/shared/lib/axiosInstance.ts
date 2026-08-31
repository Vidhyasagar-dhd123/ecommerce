import axios from 'axios';
import { tokenStorage } from '@/features/auth/utils/tokenStorage';
import { BASE_URL } from '@/constants/production_const';

export const axiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 10_000,
});

// ── Request interceptor: attach Bearer token ──────────────
axiosInstance.interceptors.request.use((config) => {
    const token = tokenStorage.getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ── Response interceptor: silent token refresh on 401 ─────
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;
            try {
                const refresh = tokenStorage.getRefreshToken();
                if (!refresh) throw new Error('No refresh token');

                // Backend envelope: { success, data: { access }, errors }
                const { data } = await axios.post<{ success: boolean; data: { access: string } | null }>(
                    `${BASE_URL}/api/v1/auth/login/refresh/`,
                    { refresh },
                );

                const newAccess = data.data?.access;
                if (!newAccess) throw new Error('No access token in refresh response');

                tokenStorage.updateAccessToken(newAccess);
                original.headers.Authorization = `Bearer ${newAccess}`;
                return axiosInstance(original);
            } catch {
                tokenStorage.clear();
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    },
);