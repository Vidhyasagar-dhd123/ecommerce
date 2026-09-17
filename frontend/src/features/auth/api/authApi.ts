import axios from 'axios';
import { BASE_URL } from '@/constants/production_const';
import { tokenStorage } from '@/features/auth/utils/tokenStorage';
import type { AuthTokens } from '@/features/auth/model/types';

// The backend wraps all responses in { success, data, errors }
interface Envelope<T> {
    success: boolean;
    data: T | null;
    errors: unknown;
}

export const login = async (email: string, password: string): Promise<AuthTokens> => {
    const response = await axios.post<Envelope<AuthTokens>>(`${BASE_URL}/api/v1/auth/login/`, {
        email,
        password,
    });
    if (!response.data.success || !response.data.data) {
        throw new Error('Login failed');
    }
    return response.data.data;
};

export const register = async (
    username: string,
    email: string,
    password: string,
    password_confirm: string,
): Promise<AuthTokens> => {
    const response = await axios.post<Envelope<AuthTokens>>(`${BASE_URL}/api/v1/auth/register/`, {
        username,
        password,
        email,
        password_confirm,
    });
    if (!response.data.success || !response.data.data) {
        throw new Error('Registration failed');
    }
    return response.data.data;
};

export const refreshAccessToken = async (refresh: string): Promise<string> => {
    const response = await axios.post<Envelope<{ access: string; refresh?: string }>>(`${BASE_URL}/api/v1/auth/login/refresh/`, {
        refresh,
    });
    if (!response.data.success || !response.data.data) {
        throw new Error('Token refresh failed');
    }
    const { access, refresh: newRefresh } = response.data.data;
    tokenStorage.updateTokens(access, newRefresh);
    return access;
};

export const logout = async (): Promise<void> => {
    const refresh = tokenStorage.getRefreshToken();
    await axios.post(`${BASE_URL}/api/v1/auth/logout/`, { refresh });
};

export const fetchUserProfile = async (accessToken?: string): Promise<{
    id: number;
    username: string;
    email: string;
    role: string;
} | null> => {
    const token = accessToken ?? tokenStorage.getAccessToken();
    if (!token) return null;
    try {
        const response = await axios.get<Envelope<{
            id: number;
            username: string;
            email: string;
            role: string;
        }>>(`${BASE_URL}/api/v1/auth/me/profile/`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data.data;
    } catch {
        return null;
    }
};

export const fetchEmployeeProfile = async (accessToken?: string): Promise<{
    id: number;
    username: string;
    email: string;
    employee_code: string;
    designation: string;
    warehouse?: number | null;
    warehouse_name?: string | null;
} | null> => {
    const token = accessToken ?? tokenStorage.getAccessToken();
    if (!token) return null;
    try {
        const response = await axios.get<Envelope<{
            id: number;
            username: string;
            email: string;
            employee_code: string;
            designation: string;
            warehouse?: number | null;
            warehouse_name?: string | null;
        }>>(`${BASE_URL}/api/v1/auth/me/employee/`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data.data;
    } catch {
        return null;
    }
};
