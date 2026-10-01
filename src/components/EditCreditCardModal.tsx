import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useFinance } from '../context/FinanceContext';
import { X } from 'lucide-react';

interface EditCreditCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    card: any;
}

export default function EditCreditCardModal({ isOpen, onClose, card }: EditCreditCardModalProps) {
    const [name, setName] = useState('');
    const [limit, setLimit] = useState('');
    const [closingDay, setClosingDay] = useState('1');
    const [dueDay, setDueDay] = useState('10');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { refreshData } = useFinance();

    useEffect(() => {
        if (card && isOpen) {
            setName(card.name);
            setLimit(String(card.limit));
            setClosingDay(String(card.closing_day));
            setDueDay(String(card.due_day));
        }
    }, [card, isOpen]);

    if (!isOpen || !card) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !limit) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('credit_cards').update({
                name,
                limit: parseFloat(limit),
                closing_day: parseInt(closingDay),
                due_day: parseInt(dueDay),
            }).eq('id', card.id);

            if (error) throw error;

            await refreshData();
            onClose();
        } catch (error) {
            console.error('Error updating credit card:', error);
            alert('Erro ao atualizar cartão');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-[var(--bg-card)] rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-[var(--border)]">
                <div className="flex justify-between items-center p-4 border-b border-[var(--border)]">
                    <h2 className="text-lg font-bold text-[var(--color-heading)] flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                        </div>
                        Editar Cartão de Crédito
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] transition-colors p-1"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto max-h-[calc(100vh-120px)]">
                    <form id="edit-card-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                                Nome do Cartão
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)] outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                                Limite (R$)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={limit}
                                onChange={(e) => setLimit(e.target.value)}
                                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)] outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                                    Dia de Fechamento
                                </label>
                                <select
                                    value={closingDay}
                                    onChange={(e) => setClosingDay(e.target.value)}
                                    className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)] outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                >
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                        <option key={day} value={day}>{day}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                                    Dia de Vencimento
                                </label>
                                <select
                                    value={dueDay}
                                    onChange={(e) => setDueDay(e.target.value)}
                                    className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)] outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                >
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                        <option key={day} value={day}>{day}</option>
                                    ))}
                                </select>
                            </div>
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
                        form="edit-card-form"
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-purple-500 text-white font-medium rounded-md hover:bg-purple-600 transition-colors disabled:opacity-50 shadow-sm"
                    >
                        {isSubmitting ? 'Salvando...' : 'Atualizar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
