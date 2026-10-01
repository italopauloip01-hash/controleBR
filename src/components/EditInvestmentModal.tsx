import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../utils/supabase';
import { useFinance } from '../context/FinanceContext';
import { X, Landmark } from 'lucide-react';
import { formatCurrencyInput, parseCurrencyToFloat } from '../utils/currencyMask';

interface EditInvestmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    investment: any;
}

export default function EditInvestmentModal({ isOpen, onClose, investment }: EditInvestmentModalProps) {
    const [name, setName] = useState('');
    const [type, setType] = useState('Renda Fixa');
    const [amount, setAmount] = useState('');
    const [yieldAmount, setYieldAmount] = useState('');
    const [date, setDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { refreshData } = useFinance();

    const investmentTypes = [
        'Renda Fixa',
        'CDB',
        'Tesouro Direto',
        'Ações',
        'Fundos Imobiliários',
        'Criptomoedas',
        'Previdência Privada',
        'Outros'
    ];

    useEffect(() => {
        if (investment && isOpen) {
            setName(investment.name);
            setType(investment.type);
            
            // Converter valores numéricos para dígitos de centavos esperados pela máscara
            const amountInCents = Math.round(investment.amount * 100);
            const yieldInCents = investment.yield ? Math.round(investment.yield * 100) : 0;
            
            setAmount(formatCurrencyInput(String(amountInCents)));
            setYieldAmount(investment.yield ? formatCurrencyInput(String(yieldInCents)) : '');
            setDate(investment.date ? investment.date.split('T')[0] : '');
        }
    }, [investment, isOpen]);

    if (!isOpen || !investment) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !type || !amount || !date) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('investments').update({
                name,
                type,
                amount: parseCurrencyToFloat(amount),
                yield: yieldAmount ? parseCurrencyToFloat(yieldAmount) : 0,
                date,
            }).eq('id', investment.id);

            if (error) throw error;

            await refreshData();
            onClose();
        } catch (error) {
            console.error('Error updating investment:', error);
            alert('Erro ao atualizar investimento');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !investment) return null;

    return createPortal(
        <div 
            className="modal-portal"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="modal-container">
                <div className="flex justify-between items-center p-4 border-b border-[var(--border)]">
                    <h2 className="text-lg font-bold text-[var(--color-heading)] flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <Landmark size={16} />
                        </div>
                        Editar Investimento
                    </h2>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] transition-colors p-3 hover:bg-[var(--bg-secondary)] rounded-full"
                        aria-label="Fechar"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto max-h-[calc(100vh-120px)]">
                    <form id="edit-investment-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                                Nome do Investimento
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
                                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-emerald-600">R$</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={amount}
                                    onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
                                    className="w-full pl-10 pr-3 py-2 border-2 border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-emerald-600 font-bold outline-none focus:border-emerald-500 transition-all text-xl"
                                    placeholder="0,00"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                                Rendimento (R$) <span className="text-xs text-[var(--color-text-muted)]">(Opcional)</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-[var(--color-text-muted)]">R$</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={yieldAmount}
                                    onChange={(e) => setYieldAmount(formatCurrencyInput(e.target.value))}
                                    className="w-full pl-10 pr-3 py-2 border-2 border-[var(--border)] rounded-lg bg-[var(--bg-secondary)] text-[var(--color-text)] font-semibold outline-none focus:border-emerald-500 transition-all"
                                    placeholder="0,00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                                Data do Investimento
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
                        form="edit-investment-form"
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-[var(--color-xp)] text-white font-medium rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50 shadow-sm"
                    >
                        {isSubmitting ? 'Salvando...' : 'Atualizar'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
