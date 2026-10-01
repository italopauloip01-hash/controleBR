import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
}

interface NotificationContextType {
    showToast: (message: string, type: ToastType) => void;
    confirmAction: (options: ConfirmOptions | string) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmDialog, setConfirmDialog] = useState<{
        options: ConfirmOptions;
        resolve: (value: boolean) => void;
    } | null>(null);

    const showToast = useCallback((message: string, type: ToastType) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const confirmAction = useCallback((options: ConfirmOptions | string) => {
        const fullOptions: ConfirmOptions = typeof options === 'string' 
            ? { message: options, title: 'Confirmação', confirmText: 'Confirmar', cancelText: 'Cancelar' }
            : { ...options, title: options.title || 'Confirmação', confirmText: options.confirmText || 'Confirmar', cancelText: options.cancelText || 'Cancelar' };

        return new Promise<boolean>((resolve) => {
            setConfirmDialog({ options: fullOptions, resolve });
        });
    }, []);

    const handleConfirm = (value: boolean) => {
        if (confirmDialog) {
            confirmDialog.resolve(value);
            setConfirmDialog(null);
        }
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <NotificationContext.Provider value={{ showToast, confirmAction }}>
            {children}
            
            {/* Toast Container */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] flex flex-col gap-3 w-full max-w-[90vw] sm:max-w-md pointer-events-none">
                {toasts.map(toast => (
                    <ToastComponent 
                        key={toast.id} 
                        toast={toast} 
                        onClose={() => removeToast(toast.id)} 
                    />
                ))}
            </div>

            {/* Confirm Modal */}
            {confirmDialog && (
                <ConfirmModal 
                    options={confirmDialog.options} 
                    onAction={handleConfirm} 
                />
            )}
        </NotificationContext.Provider>
    );
}

// Internal help components to keep file cleaner
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

function ToastComponent({ toast, onClose }: { toast: Toast, onClose: () => void }) {
    const icons = {
        success: <CheckCircle className="text-emerald-500" size={20} />,
        error: <AlertCircle className="text-rose-500" size={20} />,
        info: <Info className="text-blue-500" size={20} />
    };

    const themeColors = {
        success: 'border-emerald-500/20 bg-emerald-500/[0.05]',
        error: 'border-rose-500/20 bg-rose-500/[0.05]',
        info: 'border-blue-500/20 bg-blue-500/[0.05]'
    };

    return (
        <div className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl border backdrop-blur-md shadow-lg animate-toast-in ${themeColors[toast.type]}`}>
            <div className="flex items-center gap-3">
                {icons[toast.type]}
                <span className="text-sm font-medium text-[var(--text-primary)]">{toast.message}</span>
            </div>
            <button onClick={onClose} className="ml-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <X size={16} />
            </button>
        </div>
    );
}

function ConfirmModal({ options, onAction }: { options: ConfirmOptions, onAction: (v: boolean) => void }) {
    return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-modal-in">
                <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">{options.title}</h3>
                <p className="text-[var(--text-secondary)] mb-6">{options.message}</p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => onAction(false)}
                        className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                        {options.cancelText}
                    </button>
                    <button 
                        onClick={() => onAction(true)}
                        className="flex-1 py-2.5 rounded-xl bg-[var(--color-conta)] text-white font-bold shadow-[0_4px_12px_rgba(59,130,246,0.3)] hover:opacity-90 transition-opacity"
                    >
                        {options.confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotification must be used within NotificationProvider');
    return context;
}
