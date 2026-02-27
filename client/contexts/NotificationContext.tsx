import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Toast {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
}

interface NotificationContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
    toasts: [],
    addToast: () => {},
    removeToast: () => {},
});

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const newToast: Toast = { ...toast, id };
        setToasts(prev => [...prev, newToast]);

        const duration = toast.duration ?? 3000;
        setTimeout(() => removeToast(id), duration);
    }, [removeToast]);

    return (
        <NotificationContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
        </NotificationContext.Provider>
    );
};
