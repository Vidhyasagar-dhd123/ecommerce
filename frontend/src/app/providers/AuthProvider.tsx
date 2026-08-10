import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { login as loginRequest, register as registerRequest, logout as logoutRequest, refreshAccessToken } from '@/features/auth/api/authApi';
import { AuthContext } from '@/features/auth/contexts/AuthContext';
import type { AuthTokens, AuthUser, JwtPayload } from '@/features/auth/model/types';
import { tokenStorage } from '@/features/auth/utils/tokenStorage';

const decodePayload = (token: string): JwtPayload | null => {
    try {
        const payloadPart = token.split('.')[1];
        if (!payloadPart) {
            return null;
        }

        const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        const decoded = atob(padded);
        return JSON.parse(decoded) as JwtPayload;
    } catch {
        return null;
    }
};

const toAuthUser = (payload: JwtPayload): AuthUser => {
    return {
        userId: payload.user_id ?? null,
        username: payload.username,
        email: payload.email,
    };
};

const isExpired = (payload: JwtPayload): boolean => {
    if (!payload.exp) {
        return true;
    }

    return payload.exp * 1000 <= Date.now();
};

const syncSessionFromTokens = (tokens: AuthTokens, setUser: (user: AuthUser | null) => void): boolean => {
    const payload = decodePayload(tokens.access);
    if (!payload || isExpired(payload)) {
        return false;
    }

    tokenStorage.setTokens(tokens);
    setUser(toAuthUser(payload));
    return true;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const hydrateSession = async () => {
            const accessToken = tokenStorage.getAccessToken();
            const refreshToken = tokenStorage.getRefreshToken();

            if (!accessToken || !refreshToken) {
                tokenStorage.clear();
                setIsLoading(false);
                return;
            }

            const payload = decodePayload(accessToken);
            if (payload && !isExpired(payload)) {
                setUser(toAuthUser(payload));
                setIsLoading(false);
                return;
            }

            try {
                const refreshedAccess = await refreshAccessToken(refreshToken);
                tokenStorage.updateAccessToken(refreshedAccess);

                const refreshedPayload = decodePayload(refreshedAccess);
                if (!refreshedPayload || isExpired(refreshedPayload)) {
                    tokenStorage.clear();
                    setUser(null);
                } else {
                    setUser(toAuthUser(refreshedPayload));
                }
            } catch {
                tokenStorage.clear();
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        void hydrateSession();
    }, []);

    const login = async (username: string, password: string): Promise<boolean> => {
        try {
            const tokens = await loginRequest(username, password);
            const authenticated = syncSessionFromTokens(tokens, setUser);
            if (authenticated) {
                navigate('/dashboard', { replace: true });
            }
            return authenticated;
        } catch {
            tokenStorage.clear();
            setUser(null);
            return false;
        }
    };

    const register = async (username:string, email:string, password:string, password_confirm:string): Promise<boolean> => {
        try {
            const tokens = await registerRequest(username, email, password, password_confirm);
            const authenticated = syncSessionFromTokens(tokens, setUser);
            if (authenticated) {
                navigate('/dashboard', { replace: true });
            }
            return authenticated;
        }catch{
            tokenStorage.clear();
            setUser(null);
            return false;
        }
    };

    const logout = async (): Promise<void> => {
        try {
            await logoutRequest();
        } finally {
            tokenStorage.clear();
            setUser(null);
            navigate('/login', { replace: true });
        }
    };

    const isAuthenticated = useMemo(() => Boolean(user), [user]);

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

