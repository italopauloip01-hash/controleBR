import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useFinance } from '../context/FinanceContext';
import { X } from 'lucide-react';

interface EditAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    account: any;
}

export default function EditAccountModal({ isOpen, onClose, account }: EditAccountModalProps) {
    const [name, setName] = useState('');
    const [type, setType] = useState('Conta Corrente');
    const [balance, setBalance] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { refreshData } = useFinance();

    const accountTypes = [
        'Conta Corrente',
        'Poupança',
        'Investimento',
        'Dinheiro',
        'Outros'
    ];

    useEffect(() => {
        if (account && isOpen) {
            setName(account.name);
            setType(account.type);
            setBalance(String(account.balance));
        }
    }, [account, isOpen]);

    if (!isOpen || !account) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !type) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('accounts').update({
                name,
                type,
                balance: balance ? parseFloat(balance) : 0,
            }).eq('id', account.id);

            if (error) throw error;

            await refreshData();
            onClose();
        } catch (error) {
            console.error('Error updating account:', error);
            alert('Erro ao atualizar conta');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-[var(--bg-card)] rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-[var(--border)]">
                <div className="flex justify-between items-center p-4 border-b border-[var(--border)]">
                    <h2 className="text-lg font-bold text-[var(--color-heading)] flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                        </div>
                        Editar Conta
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] transition-colors p-1"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto max-h-[calc(100vh-120px)]">
                    <form id="edit-account-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                                Nome da Instituição
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                                Tipo da Conta
                            </label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                                {accountTypes.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                                Saldo Atual (R$)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={balance}
                                onChange={(e) => setBalance(e.target.value)}
                                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-secondary)] flex justify-end gap-3 rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 font-medium text-[var(--color-text)] hover:text-[var(--color-heading)] transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="edit-account-form"
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 shadow-sm"
                    >
                        {isSubmitting ? 'Salvando...' : 'Atualizar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
