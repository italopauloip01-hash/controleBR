import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../utils/supabase';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { X, HandCoins } from 'lucide-react';
import { formatCurrency, todayLocalISO } from '../utils/format';
import { formatCurrencyInput, parseCurrencyToFloat } from '../utils/currencyMask';

interface RedeemInvestmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    investment: any;
}

export default function RedeemInvestmentModal({ isOpen, onClose, investment }: RedeemInvestmentModalProps) {
    const [amountToRedeem, setAmountToRedeem] = useState('');
    const [accountId, setAccountId] = useState('');
    const [date, setDate] = useState(() => todayLocalISO());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { accounts, refreshData } = useFinance();
    const { user } = useAuth();

    const currentTotal = investment ? (investment.amount + (investment.yield || 0)) : 0;

    useEffect(() => {
        if (isOpen && investment) {
            // Converter o valor numérico para o formato de string de dígitos (centavos) esperado pela máscara
            const totalInCents = Math.round(currentTotal * 100);
            setAmountToRedeem(formatCurrencyInput(String(totalInCents)));
            setDate(todayLocalISO());
            setAccountId('');
        }
    }, [isOpen, investment, currentTotal]);

    if (!isOpen || !investment) return null;

    const handleRedeemFull = () => {
        setAmountToRedeem(formatCurrencyInput(String(currentTotal)));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const redeemValue = parseCurrencyToFloat(amountToRedeem);
        
        if (!redeemValue || redeemValue <= 0) {
            alert('Por favor, informe um valor válido maior que zero.');
            return;
        }

        if (redeemValue > currentTotal + 0.01) {
            alert('Não é possível resgatar mais do que o total investido.');
            return;
        }

        if (!accountId) {
            alert('Por favor, selecione uma conta de destino para enviar o dinheiro.');
            return;
        }

        if (!date) {
            alert('Por favor, selecione a data do resgate.');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Criar transação de receita (Entrada) na conta selecionada
            const { error: txError } = await supabase.from('transactions').insert({
                description: `Resgate: ${investment.name}`,
                amount: redeemValue,
                date: date,
                type: 'revenue',
                account_id: accountId,
                category_id: null,
                is_paid: true,
                payment_method: 'padrao',
                user_id: user?.id
            });

            if (txError) throw txError;

            // 2. Abater valor do investimento original
            const isFullRedemption = redeemValue >= currentTotal - 0.01;

            if (isFullRedemption) {
                // Resgate Total: Deletar o investimento da carteira
                const { error: delError } = await supabase.from('investments').delete().eq('id', investment.id);
                if (delError) throw delError;
            } else {
                // Resgate Parcial: Subtrair proporcionalmente do amount e do yield
                const ratio = redeemValue / currentTotal;
                const newAmount = investment.amount - (investment.amount * ratio);
                const newYield = investment.yield - ((investment.yield || 0) * ratio);

                const { error: updError } = await supabase.from('investments').update({
                    amount: newAmount,
                    yield: newYield
                }).eq('id', investment.id);

                if (updError) throw updError;
            }

            // Atualiza os dados locais do contexto
            await refreshData();
            
            alert(isFullRedemption ? 'Investimento resgatado totalmente com sucesso!' : 'Resgate parcial realizado com sucesso!');
            onClose();
        } catch (error) {
            console.error('Error redeeming investment:', error);
            alert('Erro ao processar o resgate do investimento.');
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
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <HandCoins size={16} />
                        </div>
                        Resgatar Investimento
                    </h2>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-heading)] transition-colors p-3 hover:bg-[var(--bg-secondary)] rounded-full"
                        title="Fechar"
                        aria-label="Fechar modal"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto max-h-[calc(100vh-120px)]">
                    <form id="redeem-investment-form" onSubmit={handleSubmit} className="space-y-4">
                        <div className="bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border)] text-sm mb-4">
                            <div className="flex justify-between text-[var(--color-text-muted)] mb-1">
                                <span>Investimento:</span>
                                <span className="font-semibold text-[var(--color-heading)]">{investment.name}</span>
                            </div>
                            <div className="flex justify-between text-[var(--color-text-muted)]">
                                <span>Total Disponível:</span>
                                <span className="font-bold text-[var(--success)]">{formatCurrency(currentTotal)}</span>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="block text-sm font-medium text-[var(--color-text)]">
                                    Valor a Resgatar (R$)
                                </label>
                                <button 
                                    type="button" 
                                    onClick={handleRedeemFull}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                    Resgatar Tudo
                                </button>
                            </div>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-blue-600">R$</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={amountToRedeem}
                                    onChange={(e) => setAmountToRedeem(formatCurrencyInput(e.target.value))}
                                    className="w-full pl-12 pr-4 py-3 md:py-4 text-xl md:text-2xl font-black border-2 border-[var(--border)] rounded-xl bg-[var(--bg-secondary)] text-blue-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                    placeholder="0,00"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                                Conta de Destino
                            </label>
                            <select
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                required
                            >
                                <option value="">Selecione a conta que receberá o valor...</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                                Data do Resgate
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </form>
                    <p className="text-xs text-[var(--color-text-muted)] mt-4">
                        * O resgate de 100% arquivará o investimento desta lista. Retiradas parciais diminuirão o saldo exibido mantendo sua rentabilidade proporcional.
                    </p>
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
                        form="redeem-investment-form"
                        disabled={isSubmitting || !accountId || !amountToRedeem}
                        className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
                    >
                        {isSubmitting ? 'Processando...' : 'Confirmar Resgate'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
