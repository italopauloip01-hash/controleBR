import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { todayLocalISO } from '../utils/format';

interface TransactionFormProps {
    type: 'income' | 'expense';
    onSuccess?: () => void;
}

export default function TransactionForm({ type, onSuccess }: TransactionFormProps) {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(todayLocalISO());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user } = useAuth();
    const { showToast } = useNotification();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !date) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('transactions').insert({
                description,
                amount: parseFloat(amount),
                date,
                type,
                user_id: user?.id,
                // Hardcoding category for now until category selector is built
                category_id: null
            });

            if (error) throw error;

            setDescription('');
            setAmount('');
            setDate(todayLocalISO());

            showToast(type === 'income' ? 'Receita adicionada com sucesso!' : 'Despesa adicionada com sucesso!', 'success');

            if (onSuccess) onSuccess();

        } catch (error) {
            console.error('Error adding transaction:', error);
            showToast('Erro ao adicionar transação', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="card p-6 border border-[var(--border)] rounded-lg">
            <h2 className="text-xl font-bold text-[var(--color-heading)] mb-4">
                Nova {type === 'income' ? 'Receita' : 'Despesa'}
            </h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                        Descrição
                    </label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)]"
                        placeholder="Ex: Salário"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                        Valor (R$)
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)]"
                        placeholder="0,00"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                        Data
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)]"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[var(--primary)] text-white font-medium py-2 px-4 rounded-md hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? 'Salvando...' : 'Adicionar'}
                </button>
            </div>
        </form>
    );
}
