import axios from 'axios';
import { BASE_URL } from '@/constants/production_const';
import type { AuthTokens } from '@/features/auth/model/types';

export const login = async (username: string, password: string) => {
    const response = await axios.post<AuthTokens>(`${BASE_URL}/api/auth/login/`, {
        username,
        password,
    });

    return response.data;
};

export const register = async (username:string, email:string, password:string,password_confirm:string)=>{
    const response  = await axios.post<AuthTokens>(`${BASE_URL}/api/auth/register/`,{
        username,
        password,
        email,
        password_confirm
    })
    return response.data
}

export const refreshAccessToken = async (refresh: string): Promise<string> => {
    const response = await axios.post<{ access: string }>(`${BASE_URL}/api/auth/login/refresh/`, {
        refresh,
    });

    return response.data.access;
};

export const logout = async (): Promise<void> => {
    const response = await axios.post(`${BASE_URL}/api/auth/logout/`);
    return response.data;
};
