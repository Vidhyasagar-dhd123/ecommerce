import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  login as loginRequest,
  register as registerRequest,
  logout as logoutRequest,
  refreshAccessToken,
  fetchUserProfile,
  fetchEmployeeProfile,
} from '@/features/auth/api/authApi';
import { AuthContext } from '@/features/auth/contexts/AuthContext';
import type { AuthTokens, AuthUser, JwtPayload } from '@/features/auth/model/types';
import { tokenStorage } from '@/features/auth/utils/tokenStorage';
import { getDashboardRoute } from '@/features/auth/utils/roleGuards';

const decodePayload = (token: string): JwtPayload | null => {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;

    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = atob(padded);
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
};

const isExpired = (payload: JwtPayload): boolean => {
  if (!payload.exp) return true;
  return payload.exp * 1000 <= Date.now();
};

const resolveFullUser = async (accessToken: string, payload: JwtPayload): Promise<AuthUser> => {
  const profile = await fetchUserProfile(accessToken);
  const role = profile?.role ?? payload.role ?? 'customer';

  let designation: string | undefined = payload.designation;
  let warehouseId: number | null | undefined;
  let warehouseName: string | null | undefined;

  if (role === 'employee') {
    const empProfile = await fetchEmployeeProfile(accessToken);
    if (empProfile) {
      designation = empProfile.designation;
      warehouseId = empProfile.warehouse;
      warehouseName = empProfile.warehouse_name;
    }
  }

  return {
    userId: profile?.id ?? payload.user_id ?? null,
    username: profile?.username ?? payload.username,
    email: profile?.email ?? payload.email,
    role,
    designation,
    warehouseId,
    warehouseName,
  };
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
        const fullUser = await resolveFullUser(accessToken, payload);
        setUser(fullUser);
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
          const fullUser = await resolveFullUser(refreshedAccess, refreshedPayload);
          setUser(fullUser);
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

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const tokens = await loginRequest(email, password);
      const payload = decodePayload(tokens.access);
      if (!payload || isExpired(payload)) return false;

      tokenStorage.setTokens(tokens);
      const fullUser = await resolveFullUser(tokens.access, payload);
      setUser(fullUser);

      // Redirect to the respective dashboard based on role/designation
      const targetRoute = getDashboardRoute(fullUser);
      navigate(targetRoute, { replace: true });
      return true;
    } catch {
      tokenStorage.clear();
      setUser(null);
      return false;
    }
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    password_confirm: string,
  ): Promise<boolean> => {
    try {
      const tokens = await registerRequest(username, email, password, password_confirm);
      const payload = decodePayload(tokens.access);
      if (!payload || isExpired(payload)) return false;

      tokenStorage.setTokens(tokens);
      const fullUser = await resolveFullUser(tokens.access, payload);
      setUser(fullUser);

      const targetRoute = getDashboardRoute(fullUser);
      navigate(targetRoute, { replace: true });
      return true;
    } catch {
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

