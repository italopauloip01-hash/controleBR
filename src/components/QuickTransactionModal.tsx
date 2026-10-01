import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { TrendingDown, TrendingUp, X } from 'lucide-react';
import { formatCurrencyInput, parseCurrencyToFloat } from '../utils/currencyMask';
import { useNotification } from '../context/NotificationContext';
import { todayLocalISO } from '../utils/format';

interface QuickTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialType?: 'expense' | 'revenue';
}

export default function QuickTransactionModal({ isOpen, onClose, onSuccess, initialType }: QuickTransactionModalProps) {
    const { user } = useAuth();
    const { categories, accounts, transactions, refreshData } = useFinance();
    const { showToast } = useNotification();

    const [type, setType] = useState<'expense' | 'revenue'>('expense');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [installments, setInstallments] = useState('1'); // New state for installments
    const [isSubmitting, setIsSubmitting] = useState(false);
    const descriptionRef = useRef<HTMLInputElement>(null);

    // Sync initial type and reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setType(initialType || 'expense');
            setDescription('');
            setAmount('');
            setCategoryId('');
            setInstallments('1');
            
            // Auto-focus after open animation
            setTimeout(() => {
                descriptionRef.current?.focus();
            }, 100);
        }
    }, [isOpen, initialType]);

    if (!isOpen) return null;

    // Filter categories based on selected type
    const filteredCategories = categories.filter(c => c.type === type || c.type === 'transference' || !c.type);

    // Extract unique recent descriptions for autocomplete
    const recentDescriptions = Array.from(new Set(
        transactions
            .filter(t => t.type === type && t.description)
            .map(t => t.description)
    ));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !user) return;

        setIsSubmitting(true);
        try {
            const numInstallments = parseInt(installments) || 1;
            const isInstallment = numInstallments > 1;
            const floatAmount = parseCurrencyToFloat(amount);
            const installmentAmount = isInstallment ? floatAmount / numInstallments : floatAmount;

            // Payload based on the behavior seen in ExpenseForm.tsx for installments
            const payload = {
                description,
                amount: installmentAmount,
                date: todayLocalISO(), // Data local correta
                type,
                category_id: categoryId || null,
                account_id: isInstallment ? null : (accounts.length > 0 ? accounts[0].id : null), // Se parcelado, idealmente é cartão, então assumimos sem conta por hora
                payment_method: isInstallment ? 'cartao_credito' : null, // Assumimos cartão de crédito se parcelado no Quick Add
                is_paid: isInstallment ? false : true, // Se parcelou no Quick Add assumimos que não tá pago ainda (vai para fatura)
                installments: numInstallments,
                user_id: user?.id
            };

            const { error } = await supabase.from('transactions').insert(payload);
            if (error) throw error;

            await refreshData();

            // Reset form
            setDescription('');
            setAmount('');
            setCategoryId('');
            setInstallments('1');

            showToast('Lançamento realizado com sucesso! 🚀', 'success');
            if (onSuccess) onSuccess();
            onClose();

        } catch (error) {
            console.error('Error in quick add:', error);
            showToast('Erro ao realizar lançamento rápido.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <span className="text-xl px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white shadow-lg">⚡</span> Adição Rápida
                    </h2>
                    <button onClick={onClose} className="p-2 text-[var(--text-secondary)] hover:text-white hover:bg-slate-700 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {/* Toggle Switch */}
                    <div className="flex mb-6 bg-[var(--bg-color)] p-1 rounded-xl border border-[var(--border-color)]">
                        <button
                            type="button"
                            onClick={() => setType('expense')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold transition-all ${type === 'expense'
                                ? 'bg-gradient-to-r from-rose-500 to-red-600 outline-none text-white shadow-lg'
                                : 'text-[var(--text-secondary)] hover:text-white'}`}
                        >
                            <TrendingDown size={18} /> Despesa
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('revenue')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold transition-all ${type === 'revenue'
                                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg'
                                : 'text-[var(--text-secondary)] hover:text-white'}`}
                        >
                            <TrendingUp size={18} /> Receita
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <input
                                ref={descriptionRef}
                                type="text"
                                list="quick-desc-suggestions"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-3 md:py-4 text-lg md:text-xl font-medium border-2 border-transparent bg-[var(--bg-color)] rounded-xl focus:border-[var(--color-conta)] focus:bg-[rgba(30,41,59,0.8)] transition-all outline-none text-white placeholder-[var(--text-secondary)] shadow-inner"
                                placeholder="O que foi?"
                                required
                            />
                            <datalist id="quick-desc-suggestions">
                                {recentDescriptions.map((desc, idx) => (
                                    <option key={idx} value={desc} />
                                ))}
                            </datalist>
                        </div>

                        <div className="relative">
                            <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold ${type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>R$</span>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
                                className={`w-full pl-14 pr-4 py-4 md:py-5 text-2xl md:text-4xl font-black border-2 border-transparent bg-[var(--bg-color)] rounded-xl focus:bg-[rgba(30,41,59,0.8)] transition-all outline-none placeholder-[var(--text-secondary)] shadow-inner ${
                                    type === 'expense' ? 'text-red-500 focus:border-red-500' : 'text-green-500 focus:border-green-500'
                                }`}
                                placeholder="0,00"
                                required
                            />
                        </div>

                        <div>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="w-full px-4 py-3 text-sm border-2 border-transparent bg-[var(--bg-color)] rounded-xl focus:border-[var(--color-conta)] focus:bg-[rgba(30,41,59,0.8)] transition-colors outline-none text-[var(--text-secondary)]"
                            >
                                <option value="">Categoria (Opcional)</option>
                                {filteredCategories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Installments Option (Expensives only) */}
                        {type === 'expense' && (
                            <div className="flex items-center gap-3 bg-[var(--bg-color)] p-3 rounded-xl border border-[var(--border-color)]">
                                <label className="text-sm font-medium text-[var(--text-secondary)] flex-1">
                                    Parcelar em:
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="72"
                                    value={installments}
                                    onChange={(e) => setInstallments(e.target.value)}
                                    className="w-20 px-3 py-2 text-center font-bold border-2 border-[var(--border-color)] bg-[rgba(30,41,59,0.5)] rounded-lg focus:border-[var(--color-despesa)] transition-colors outline-none text-white"
                                    placeholder="1"
                                />
                                <span className="text-sm text-[var(--text-secondary)]">x</span>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !description || !amount}
                        className={`w-full mt-6 flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 ${type === 'expense'
                            ? 'bg-rose-600 hover:bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                            : 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                            }`}
                    >
                        {isSubmitting ? 'Lançando...' : 'Lançar Agora 🚀'}
                    </button>
                </form>
            </div>
        </div>
    );
}
