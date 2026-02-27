import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useNotification, Toast as ToastType } from '../contexts/NotificationContext';

const ICON_MAP: Record<ToastType['type'], { icon: React.FC<any>; color: string; bg: string; border: string }> = {
    success: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    error: { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
    warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    info: { icon: Info, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
};

const ToastItem: React.FC<{ toast: ToastType }> = ({ toast }) => {
    const { removeToast } = useNotification();
    const cfg = ICON_MAP[toast.type];
    const Icon = cfg.icon;

    return (
        <div className={`flex items-start gap-3 px-4 py-3 bg-white border ${cfg.border} rounded-xl shadow-lg min-w-[280px] max-w-[380px] animate-in slide-in-from-right-4 fade-in duration-300`}>
            <div className={`shrink-0 w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                <Icon size={16} className={cfg.color} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[13px] font-bold text-slate-800 leading-tight">{toast.title}</p>
                {toast.message && <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">{toast.message}</p>}
            </div>
            <button onClick={() => removeToast(toast.id)} className="shrink-0 p-1 text-slate-300 hover:text-slate-500 transition-colors">
                <X size={14} />
            </button>
        </div>
    );
};

const ToastContainer: React.FC = () => {
    const { toasts } = useNotification();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} />
            ))}
        </div>
    );
};

export default ToastContainer;
