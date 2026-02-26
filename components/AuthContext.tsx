import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ---- Types ----
export interface UserProfile {
    id: string;
    name: string;
    phone: string;
    company: string;
    role: string;
    avatar?: string;
}

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

// ---- Storage Key ----
const AUTH_STORAGE_KEY = 'ihr_nexus_auth';

// ---- Mock data ----
const MOCK_USERS: Record<string, UserProfile> = {
    '13800000000': {
        id: 'user_hr_001',
        name: '刘思远',
        phone: '13800000000',
        company: 'IHR 智能招聘',
        role: '高级HR经理',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80',
    },
    '13900000000': {
        id: 'user_hr_002',
        name: '张晓燕',
        phone: '13900000000',
        company: 'IHR 智能招聘',
        role: '招聘总监',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&q=80',
    },
};

// ---- Context ----
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

// ---- Provider ----
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // On mount: check localStorage for saved session
    useEffect(() => {
        try {
            const saved = localStorage.getItem(AUTH_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved) as UserProfile;
                setUser(parsed);
            }
        } catch {
            localStorage.removeItem(AUTH_STORAGE_KEY);
        }
        setIsLoading(false);
    }, []);

    // Persist auth state
    const persistUser = (u: UserProfile | null) => {
        if (u) {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));
        } else {
            localStorage.removeItem(AUTH_STORAGE_KEY);
        }
        setUser(u);
    };

    // Mock: send verification code
    const sendVerificationCode = async (phone: string): Promise<boolean> => {
        // Simulate network delay
        await new Promise((r) => setTimeout(r, 800));
        // In mock mode, any valid phone format succeeds
        return /^1[3-9]\d{9}$/.test(phone);
    };

    // Mock: login with phone + code
    const login = async (phone: string, _code: string): Promise<boolean> => {
        await new Promise((r) => setTimeout(r, 1000));
        // Mock: code "1234" always works; any user in MOCK_USERS or auto-create
        if (_code !== '1234') return false;
        const existing = MOCK_USERS[phone];
        const profile: UserProfile = existing || {
            id: 'user_' + Date.now(),
            name: '用户' + phone.slice(-4),
            phone,
            company: '未填写',
            role: '招聘顾问',
        };
        persistUser(profile);
        return true;
    };

    const logout = () => {
        persistUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
                sendVerificationCode,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
