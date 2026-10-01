import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { todayLocalISO } from '../utils/format';

export default function InvestmentForm() {
    const [name, setName] = useState('');
    const [type, setType] = useState('Renda Fixa');
    const [amount, setAmount] = useState('');
    const [yieldAmount, setYieldAmount] = useState('');
    const [date, setDate] = useState(todayLocalISO());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user } = useAuth();
    const { refreshData } = useFinance();
    const { showToast } = useNotification();

    const investmentTypes = [
        'Renda Fixa',
        'Ações',
        'FIIs',
        'Tesouro Direto',
        'Criptomoedas',
        'Outros'
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !type || !amount || !date) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('investments').insert({
                name,
                type,
                amount: parseFloat(amount),
                yield: yieldAmount ? parseFloat(yieldAmount) : 0,
                date,
                user_id: user?.id
            });

            if (error) throw error;

            setName('');
            setType('Renda Fixa');
            setAmount('');
            setYieldAmount('');
            setDate(todayLocalISO());

            await refreshData();
            showToast('Investimento adicionado com sucesso!', 'success');

        } catch (error) {
            console.error('Error adding investment:', error);
            showToast('Erro ao salvar investimento. Verifique os dados.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="card p-6 border border-[var(--border)] rounded-lg">
            <h2 className="text-xl font-bold text-[var(--color-heading)] mb-4">
                Novo Investimento
            </h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                        Nome do Ativo
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)]"
                        placeholder="Ex: CDB Banco Inter, PETR4"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                        Tipo
                    </label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)]"
                        required
                    >
                        {investmentTypes.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                        Valor Investido (R$)
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
                        Rendimento (R$)
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={yieldAmount}
                        onChange={(e) => setYieldAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)]"
                        placeholder="0,00"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                        Data do Investimento
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
                    {isSubmitting ? 'Salvando...' : 'Adicionar Investimento'}
                </button>
            </div>
        </form>
    );
}
