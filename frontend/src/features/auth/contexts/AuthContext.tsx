import { createContext } from 'react';
import type { AuthUser } from '@/features/auth/model/types';

export interface AuthContextType {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    register: (username:string, email:string, password:string, password_confirm:string) => Promise<boolean>;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
