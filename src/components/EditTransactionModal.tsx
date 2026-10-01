import { X } from 'lucide-react';
import IncomeForm from './IncomeForm';
import ExpenseForm from './ExpenseForm';

interface EditTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: any | null;
}

export default function EditTransactionModal({ isOpen, onClose, transaction }: EditTransactionModalProps) {
    if (!isOpen || !transaction) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]" onMouseDown={onClose}>
            <div 
                className="bg-[var(--bg-color)] rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col relative border border-[var(--border)]"
                onMouseDown={e => e.stopPropagation()}
            >
                <div className="flex justify-end p-2 pb-0 shrink-0">
                    <button
                        onClick={onClose}
                        className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-heading)] hover:bg-[var(--bg-secondary)] rounded-full transition-colors z-10"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-1 pb-4">
                    {transaction.type === 'revenue' ? (
                        <IncomeForm initialData={transaction} onSuccess={onClose} />
                    ) : (
                        <ExpenseForm initialData={transaction} onSuccess={onClose} />
                    )}
                </div>
            </div>
        </div>
    );
}
