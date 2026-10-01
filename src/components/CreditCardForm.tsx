import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export default function CreditCardForm() {
    const [name, setName] = useState('');
    const [limit, setLimit] = useState('');
    const [closingDay, setClosingDay] = useState('1');
    const [dueDay, setDueDay] = useState('10');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user } = useAuth();
    const { refreshData } = useFinance();
    const { showToast } = useNotification();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !limit || !closingDay || !dueDay) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('credit_cards').insert({
                name,
                limit: parseFloat(limit),
                closing_day: parseInt(closingDay),
                due_day: parseInt(dueDay),
                user_id: user?.id
            });

            if (error) throw error;

            setName('');
            setLimit('');
            setClosingDay('1');
            setDueDay('10');

            await refreshData();
            showToast('Cartão de crédito adicionado com sucesso!', 'success');
        } catch (error) {
            console.error('Error adding credit card:', error);
            showToast('Erro ao adicionar cartão. Verifique os dados.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="card p-6 border border-[var(--border)] rounded-lg">
            <h2 className="text-xl font-bold text-[var(--color-heading)] mb-4">
                Novo Cartão
            </h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                        Nome do Cartão
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)]"
                        placeholder="Ex: Nubank, Itaú"
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
                        min="0"
                        value={limit}
                        onChange={(e) => setLimit(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)]"
                        placeholder="0,00"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                            Dia de Fechamento
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="31"
                            value={closingDay}
                            onChange={(e) => setClosingDay(e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)]"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                            Dia do Vencimento
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="31"
                            value={dueDay}
                            onChange={(e) => setDueDay(e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)]"
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[var(--primary)] text-white font-medium py-2 px-4 rounded-md hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? 'Salvando...' : 'Adicionar Cartão'}
                </button>
            </div>
        </form>
    );
}
