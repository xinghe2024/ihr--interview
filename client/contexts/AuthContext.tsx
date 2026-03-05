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
import { setUserId as setAnalyticsUserId, clearUserId as clearAnalyticsUserId, track } from '../services/analytics';

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
        track('action.auth.logout');
        clearAnalyticsUserId();
        clearAuth();
        setUser(null);
    };

    // Register force-logout callback for API client (token expiry)
    useEffect(() => {
        setForceLogoutCallback(doLogout);
    }, []);

    // 插件侧边栏模式：接收来自 sidepanel wrapper 的 JWT 注入
    useEffect(() => {
        const isSidebarMode = new URLSearchParams(window.location.search).get('mode') === 'sidebar';
        if (!isSidebarMode) return;

        const handler = (e: MessageEvent) => {
            if (e.data?.type === 'INJECT_AUTH' && e.data.token && e.data.user) {
                storeAuth(e.data.token, e.data.refreshToken || '', e.data.user);
                setUser(e.data.user);
                setAnalyticsUserId(e.data.user.id);
                setIsLoading(false);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
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
                        setAnalyticsUserId(savedUser.id);
                    } catch {
                        // Refresh failed — clear stale auth
                        clearAuth();
                    }
                } else {
                    // No refresh token but has access token — use it until it expires
                    setUser(savedUser);
                    setAnalyticsUserId(savedUser.id);
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
            setAnalyticsUserId(res.user.id);
            track('action.auth.login_completed');
            return true;
        } catch {
            track('action.auth.login_failed', { error_code: 'unknown' });
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
