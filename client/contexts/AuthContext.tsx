import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { UserProfile } from '../../shared/types';
import {
  auth as authApi,
  getStoredUser,
  getStoredToken,
  getStoredRefreshToken,
  storeAuth,
  clearAuth,
  setForceLogoutCallback,
} from '../services/api';

export type { UserProfile };

interface AuthState {
    user: UserProfile | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
    login: (phone: string, code: string) => Promise<boolean>;
    logout: () => void;
    sendVerificationCode: (phone: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const doLogout = () => {
        clearAuth();
        setUser(null);
    };

    // Register force-logout callback for API client (token expiry)
    useEffect(() => {
        setForceLogoutCallback(doLogout);
    }, []);

    // On mount: restore session from localStorage
    useEffect(() => {
        const restore = async () => {
            const savedUser = getStoredUser();
            const token = getStoredToken();
            const refreshToken = getStoredRefreshToken();

            if (savedUser && token) {
                // Try to validate token by refreshing
                if (refreshToken) {
                    try {
                        const res = await authApi.refresh(refreshToken);
                        storeAuth(res.token, refreshToken, savedUser);
                        setUser(savedUser);
                    } catch {
                        // Refresh failed — clear stale auth
                        clearAuth();
                    }
                } else {
                    // No refresh token but has access token — use it until it expires
                    setUser(savedUser);
                }
            }
            setIsLoading(false);
        };
        restore();
    }, []);

    const sendVerificationCode = async (phone: string): Promise<boolean> => {
        try {
            const res = await authApi.sendCode(phone);
            return res.sent;
        } catch {
            return false;
        }
    };

    const login = async (phone: string, code: string): Promise<boolean> => {
        try {
            const res = await authApi.login(phone, code);
            storeAuth(res.token, res.refreshToken, res.user);
            setUser(res.user);
            return true;
        } catch {
            return false;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout: doLogout,
                sendVerificationCode,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
