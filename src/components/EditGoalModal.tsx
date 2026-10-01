import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useFinance } from '../context/FinanceContext';
import { X } from 'lucide-react';

interface EditGoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    goal: any;
}

export default function EditGoalModal({ isOpen, onClose, goal }: EditGoalModalProps) {
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [currentAmount, setCurrentAmount] = useState('');
    const [deadline, setDeadline] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { refreshData } = useFinance();

    useEffect(() => {
        if (goal && isOpen) {
            setName(goal.name);
            setTargetAmount(String(goal.target_amount));
            setCurrentAmount(goal.current_amount ? String(goal.current_amount) : '0');
            setDeadline(goal.deadline ? goal.deadline.split('T')[0] : '');
        }
    }, [goal, isOpen]);

    if (!isOpen || !goal) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !targetAmount || !deadline) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('goals').update({
                name,
                target_amount: parseFloat(targetAmount),
                current_amount: currentAmount ? parseFloat(currentAmount) : 0,
                deadline,
            }).eq('id', goal.id);

            if (error) throw error;

            await refreshData();
            onClose();
        } catch (error) {
            console.error('Error updating goal:', error);
            alert('Erro ao atualizar meta');
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </div>
                        Editar Meta
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] transition-colors p-1"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto max-h-[calc(100vh-120px)]">
                    <form id="edit-goal-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                                Nome da Meta
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)] outline-none focus:border-[var(--color-meta)] focus:ring-1 focus:ring-[var(--color-meta)]"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                                Valor Alvo (R$)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={targetAmount}
                                onChange={(e) => setTargetAmount(e.target.value)}
                                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)] outline-none focus:border-[var(--color-meta)] focus:ring-1 focus:ring-[var(--color-meta)]"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                                Valor Atual Guardado (R$)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={currentAmount}
                                onChange={(e) => setCurrentAmount(e.target.value)}
                                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)] outline-none focus:border-[var(--color-meta)] focus:ring-1 focus:ring-[var(--color-meta)]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                                Prazo (Data Limite)
                            </label>
                            <input
                                type="date"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)] outline-none focus:border-[var(--color-meta)] focus:ring-1 focus:ring-[var(--color-meta)]"
                                required
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
                        form="edit-goal-form"
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-[var(--color-meta)] text-white font-medium rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50 shadow-sm"
                    >
                        {isSubmitting ? 'Salvando...' : 'Atualizar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
