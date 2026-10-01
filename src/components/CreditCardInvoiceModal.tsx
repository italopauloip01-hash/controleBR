import { X, CreditCard, Check } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { format, setMonth, setYear, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { todayLocalISO, parseDateLocal } from '../utils/format';

interface CreditCardInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    card: any | null;
}

export default function CreditCardInvoiceModal({ isOpen, onClose, card }: CreditCardInvoiceModalProps) {
    const { transactions, selectedMonth, selectedYear, accounts } = useFinance();
    const { user } = useAuth();
    const [isPaying, setIsPaying] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState('');

    if (!isOpen || !card) return null;

    // Filter transactions for this card in the selected global period
    const currentDate = setYear(setMonth(new Date(), selectedMonth), selectedYear);
    const currentMonthStart = startOfMonth(currentDate);
    const currentMonthEnd = endOfMonth(currentDate);

    const cardTransactions = transactions.filter(t => {
        if (t.credit_card_id !== card.id) return false;
        const tDate = parseDateLocal(t.date);
        return !isNaN(tDate.getTime()) && isWithinInterval(tDate, { start: currentMonthStart, end: currentMonthEnd });
    });

    const isInvoicePaid = cardTransactions.length > 0 && cardTransactions.every(t => t.is_paid);
    const totalInvoice = cardTransactions.reduce((acc, t) => acc + t.amount, 0);

    const handlePayInvoice = async () => {
        if (!selectedAccount) {
            alert('Por favor, selecione uma conta para debitar o valor da fatura.');
            return;
        }

        if (cardTransactions.length === 0) return;

        setIsPaying(true);
        try {
            // 1. Mark all these transactions as paid
            const transactionIds = cardTransactions.map(t => t.id);
            const { error: updateError } = await supabase
                .from('transactions')
                .update({ is_paid: true })
                .in('id', transactionIds);

            if (updateError) throw updateError;

            // 2. Create a single expense transaction to represent the invoice payment on the account
            const { error: insertError } = await supabase.from('transactions').insert({
                description: `Pagamento Fatura ${card.name} - ${format(currentDate, 'MM/yyyy')}`,
                amount: totalInvoice,
                date: todayLocalISO(), // Pay today (local)
                type: 'expense',
                account_id: selectedAccount,
                is_paid: true, // Already paid
                payment_method: 'padrao',
                user_id: user?.id
            });

            if (insertError) throw insertError;

            alert('Fatura paga com sucesso!');
            onClose();
        } catch (error) {
            console.error('Error paying invoice:', error);
            alert('Erro ao processar o pagamento da fatura.');
        } finally {
            setIsPaying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-[var(--bg-color)] rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col relative border border-[var(--border)]">
                <div className="p-6 border-b border-[var(--border)] flex justify-between items-center sticky top-0 bg-[var(--bg-color)] z-10 rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--color-heading)]">Fatura - {card.name}</h2>
                            <p className="text-sm text-[var(--color-text-muted)] capitalize">
                                {format(currentDate, 'MMMM, yyyy', { locale: ptBR })}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-heading)] hover:bg-[var(--bg-secondary)] rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Resumo */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="card p-4 border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)]">
                            <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-1">Total da Fatura</h3>
                            <p className="text-2xl font-bold text-[var(--color-heading)]">
                                R$ {totalInvoice.toFixed(2).replace('.', ',')}
                            </p>
                        </div>
                        <div className="card p-4 border border-[var(--border)] rounded-lg bg-[var(--bg-secondary)]">
                            <h3 className="text-sm font-medium text-[var(--color-text-muted)] mb-1">Status</h3>
                            <p className={`text-lg font-bold flex items-center gap-2 ${isInvoicePaid ? 'text-green-500' : 'text-orange-500'}`}>
                                {isInvoicePaid ? (
                                    <><Check size={18} /> Paga</>
                                ) : (
                                    cardTransactions.length === 0 ? 'Sem transações' : 'Aberta / Pendente'
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Lista de Compras */}
                    <div>
                        <h4 className="font-semibold text-[var(--color-heading)] mb-3">Compras no período</h4>
                        {cardTransactions.length === 0 ? (
                            <p className="text-sm text-[var(--color-text-muted)] italic">Nenhuma compra registrada nesta fatura.</p>
                        ) : (
                            <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                                        <tr>
                                            <th className="py-2 px-3 font-medium text-[var(--color-heading)]">Data</th>
                                            <th className="py-2 px-3 font-medium text-[var(--color-heading)]">Descrição</th>
                                            <th className="py-2 px-3 font-medium text-[var(--color-heading)] text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border)]">
                                        {cardTransactions.map(t => (
                                            <tr key={t.id} className="hover:bg-[var(--bg-secondary)]">
                                                <td className="py-2 px-3 text-[var(--color-text)]">
                                                    {!isNaN(new Date(t.date).getTime()) ? format(parseDateLocal(t.date), 'dd/MM') : '-'}
                                                </td>
                                                <td className="py-2 px-3 text-[var(--color-heading)]">{t.description}</td>
                                                <td className="py-2 px-3 text-[var(--danger)] text-right font-medium">
                                                    R$ {t.amount.toFixed(2).replace('.', ',')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Pagamento */}
                    {!isInvoicePaid && cardTransactions.length > 0 && (
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4 mt-6">
                            <h4 className="font-semibold text-[var(--color-heading)] mb-3">Pagar Fatura</h4>
                            <div className="flex flex-col sm:flex-row gap-3 items-end">
                                <div className="flex-1 w-full">
                                    <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">
                                        Conta de Origem (Débito)
                                    </label>
                                    <select
                                        value={selectedAccount}
                                        onChange={(e) => setSelectedAccount(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-md bg-[var(--bg-color)] text-[var(--color-text)] outline-none"
                                    >
                                        <option value="">Selecione uma conta...</option>
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={handlePayInvoice}
                                    disabled={isPaying || !selectedAccount}
                                    className="w-full sm:w-auto bg-[var(--primary)] text-white font-medium py-2 px-4 rounded-md hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 h-[38px] flex items-center justify-center"
                                >
                                    {isPaying ? 'Processando...' : 'Confirmar Pagamento'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
