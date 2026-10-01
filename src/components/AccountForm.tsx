import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export default function AccountForm() {
    const [name, setName] = useState('');
    const [type, setType] = useState('Conta Corrente');
    const [balance, setBalance] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { refreshData } = useFinance();
    const { user } = useAuth();
    const { showToast } = useNotification();

    const accountTypes = [
        'Conta Corrente',
        'Poupança',
        'Investimento',
        'Dinheiro',
        'Outros'
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !type) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('accounts').insert({
                name,
                type,
                balance: balance ? parseFloat(balance) : 0,
                user_id: user?.id,
            });

            if (error) throw error;

            setName('');
            setType('Conta Corrente');
            setBalance('');
            
            await refreshData();
            showToast('Conta adicionada com sucesso!', 'success');
        } catch (error) {
            console.error('Error adding account:', error);
            showToast('Erro ao adicionar conta. Verifique os dados.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="card p-6 border border-[var(--border)] rounded-lg">
            <h2 className="text-xl font-bold text-[var(--color-heading)] mb-4">
                Nova Conta
            </h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                        Nome da Conta
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)]"
                        placeholder="Ex: Nubank, Banco do Brasil"
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
                        {accountTypes.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                        Saldo Inicial (R$)
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={balance}
                        onChange={(e) => setBalance(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)]"
                        placeholder="0,00"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[var(--primary)] text-white font-medium py-2 px-4 rounded-md hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? 'Salvando...' : 'Adicionar Conta'}
                </button>
            </div>
        </form>
    );
}
