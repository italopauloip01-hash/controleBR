import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { todayLocalISO } from '../utils/format';

export default function GoalForm() {
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [currentAmount, setCurrentAmount] = useState('');
    const [deadline, setDeadline] = useState(todayLocalISO());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user } = useAuth();
    const { refreshData } = useFinance();
    const { showToast } = useNotification();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !targetAmount || !deadline) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('goals').insert({
                name,
                target_amount: parseFloat(targetAmount),
                current_amount: currentAmount ? parseFloat(currentAmount) : 0,
                deadline,
                user_id: user?.id,
            });

            if (error) throw error;

            setName('');
            setTargetAmount('');
            setCurrentAmount('');
            setDeadline(todayLocalISO());

            await refreshData();
            showToast('Meta adicionada com sucesso!', 'success');
        } catch (error) {
            console.error('Error adding goal:', error);
            showToast('Erro ao adicionar meta. Verifique os dados.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="card p-6 border border-[var(--border)] rounded-lg">
            <h2 className="text-xl font-bold text-[var(--color-heading)] mb-4">
                Nova Meta
            </h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                        Nome da Meta
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)]"
                        placeholder="Ex: Reserva de Emergência, Carro"
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
                        min="0"
                        value={targetAmount}
                        onChange={(e) => setTargetAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)]"
                        placeholder="0,00"
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
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)]"
                        placeholder="0,00"
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
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)]"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[var(--primary)] text-white font-medium py-2 px-4 rounded-md hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? 'Salvando...' : 'Criar Meta'}
                </button>
            </div>
        </form>
    );
}
