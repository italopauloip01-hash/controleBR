import { useState, useRef, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { inferCategoryName } from '../utils/categoriesMap';
import { formatCurrencyInput, parseCurrencyToFloat } from '../utils/currencyMask';
import { useNotification } from '../context/NotificationContext';
import { todayLocalISO } from '../utils/format';
import { TrendingUp, Landmark, Calendar, Repeat, CheckCircle2 } from 'lucide-react';

interface IncomeFormProps {
    onSuccess?: () => void;
    initialData?: any;
}

export default function IncomeForm({ onSuccess, initialData }: IncomeFormProps) {
    const { categories, accounts, refreshData, transactions } = useFinance();
    const { user } = useAuth();
    const { showToast } = useNotification();

    const [description, setDescription] = useState(initialData?.description || '');
    const [amount, setAmount] = useState(initialData?.amount ? formatCurrencyInput((initialData.amount * 100).toFixed(0)) : '');
    const [date, setDate] = useState(initialData?.date ? initialData.date.split('T')[0] : todayLocalISO());
    const [accountId, setAccountId] = useState(initialData?.account_id || '');
    const [isFixed, setIsFixed] = useState(initialData?.is_fixed || false);
    const [fixedEndDate, setFixedEndDate] = useState(initialData?.fixed_end_date ? initialData.fixed_end_date.split('T')[0] : '');
    const [isPaid, setIsPaid] = useState(initialData?.is_paid ?? true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const descriptionRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (descriptionRef.current && !initialData) {
            descriptionRef.current.focus();
        }
    }, [initialData]);

    const incomeCategories = categories.filter(c => c.type === 'revenue' || c.type === 'transference' || !c.type);

    const recentDescriptions = Array.from(new Set(
        transactions
            .filter(t => t.type === 'revenue' && t.description)
            .map(t => t.description)
    ));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !date || !accountId || !user || isSubmitting) {
            showToast('Preencha os campos obrigatórios!', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            let finalCategoryId = null;
            if (initialData?.category_id && description === initialData.description) {
                finalCategoryId = initialData.category_id;
            } else {
                const mappedCategoryName = inferCategoryName(description, 'revenue');
                const existingCategory = incomeCategories.find(c => 
                    c.name.trim().toLowerCase() === mappedCategoryName.toLowerCase()
                );

                if (existingCategory) {
                    finalCategoryId = existingCategory.id;
                } else {
                    const { data: newCat, error: catError } = await supabase
                        .from('categories')
                        .insert({ name: mappedCategoryName, type: 'revenue', user_id: user?.id })
                        .select()
                        .single();
                    if (!catError && newCat) finalCategoryId = newCat.id;
                }
            }

            const payload = {
                description,
                amount: parseCurrencyToFloat(amount),
                date,
                type: 'revenue',
                category_id: (finalCategoryId && String(finalCategoryId).trim() !== '') ? finalCategoryId : null,
                account_id: (accountId && String(accountId).trim() !== '') ? accountId : null,
                is_fixed: isFixed,
                fixed_end_date: (isFixed && fixedEndDate && fixedEndDate.trim() !== '') ? fixedEndDate : null,
                is_paid: isPaid,
                user_id: user?.id
            };

            const { error } = initialData?.id
                ? await supabase.from('transactions').update(payload).eq('id', initialData.id)
                : await supabase.from('transactions').insert(payload);

            if (error) throw error;

            setDescription('');
            setAmount('');
            setDate(todayLocalISO());
            setAccountId('');
            setIsFixed(false);
            setFixedEndDate('');
            setIsPaid(true);

            showToast(initialData ? 'Receita atualizada!' : 'Valor capturado com sucesso!', 'success');
            await refreshData();
            if (onSuccess) onSuccess();

        } catch (error: any) {
            console.error('Error adding income:', error);
            showToast(`Erro ao tramitar valor: ${error?.message || 'Falha'}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20">
                    <TrendingUp size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-[var(--color-receita)] tracking-tight">
                        {initialData ? 'Editar Captura' : 'Nova Entrada'}
                    </h2>
                    <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-0.5">Incrementar Patrimônio</p>
                </div>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl shadow-sm flex flex-col gap-5">
                {/* Master Input Amount */}
                <div className="relative group">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-[var(--color-receita)] opacity-70 group-focus-within:opacity-100 transition-opacity">R$</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
                        className="w-full pl-16 pr-6 py-5 text-4xl md:text-5xl font-black border-2 border-[var(--border-color)] rounded-[1.5rem] bg-[var(--bg-secondary)] text-[var(--color-receita)] focus:border-[var(--color-receita)] focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder-[var(--color-receita)]/20"
                        placeholder="0,00"
                        required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Descrição */}
                    <div className="relative">
                        <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">
                            Descrição Principal
                        </label>
                        <input
                            ref={descriptionRef}
                            type="text"
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            className="w-full px-5 py-4 border-2 border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)] text-lg font-bold text-[var(--text-primary)] focus:border-[var(--color-receita)] focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder-[var(--text-muted)]"
                            placeholder="Ex: Salário, Projeto Alpha..."
                            required
                            autoComplete="off"
                        />
                        {showSuggestions && recentDescriptions.filter(d => d.toLowerCase().includes(description.toLowerCase()) && d !== description).length > 0 && (
                            <ul className="absolute z-50 w-full mt-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xl max-h-48 overflow-y-auto">
                                {recentDescriptions
                                    .filter(d => d.toLowerCase().includes(description.toLowerCase()) && d !== description)
                                    .map((desc, idx) => (
                                        <li
                                            key={idx}
                                            className="px-5 py-3 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--hover-bg)] cursor-pointer border-b border-[var(--border-color)] last:border-0 transition-colors"
                                            onClick={() => {
                                                setDescription(desc);
                                                setShowSuggestions(false);
                                            }}
                                        >
                                            {desc}
                                        </li>
                                    ))}
                            </ul>
                        )}
                    </div>

                    {/* Conta */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">
                            <Landmark size={14}/> Cofre de Destino
                        </label>
                        <select
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            className="w-full px-5 py-4 border-2 border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)] text-lg font-bold text-[var(--text-primary)] focus:border-[var(--color-receita)] outline-none transition-all appearance-none cursor-pointer"
                            required
                        >
                            <option value="" disabled>Onde o valor vai cair?</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Data */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">
                            <Calendar size={14}/> Data do Fato
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-5 py-4 border-2 border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)] text-lg font-bold text-[var(--text-primary)] focus:border-[var(--color-receita)] outline-none transition-all cursor-text min-h-[60px]"
                            required
                        />
                    </div>

                    {/* Custom Toggles */}
                    <div className="flex flex-col gap-3 justify-center mt-2 md:mt-6">
                        <label className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all ${isPaid ? 'border-[var(--color-receita)] bg-emerald-500/5' : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'}`}>
                            <div className="flex items-center gap-3">
                                <CheckCircle2 size={20} className={isPaid ? 'text-[var(--color-receita)]' : 'text-[var(--text-muted)]'} />
                                <span className="font-bold text-[var(--text-primary)] text-sm">Valor já recebido?</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={isPaid}
                                onChange={(e) => setIsPaid(e.target.checked)}
                                className="w-5 h-5 text-[var(--color-receita)] border-2 border-[var(--border-color)] rounded-md focus:ring-0 cursor-pointer"
                            />
                        </label>
                        
                        <label className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all ${isFixed ? 'border-[var(--color-receita)] bg-emerald-500/5' : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'}`}>
                            <div className="flex items-center gap-3">
                                <Repeat size={20} className={isFixed ? 'text-[var(--color-receita)]' : 'text-[var(--text-muted)]'} />
                                <span className="font-bold text-[var(--text-primary)] text-sm">Contrato Mensal Fixo</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={isFixed}
                                onChange={(e) => setIsFixed(e.target.checked)}
                                className="w-5 h-5 text-[var(--color-receita)] border-2 border-[var(--border-color)] rounded-md focus:ring-0 cursor-pointer"
                            />
                        </label>
                    </div>
                    
                    {/* Fixed date extra */}
                    {isFixed && (
                        <div className="md:col-span-2 animate-fade-in mt-2 border-l-4 border-[var(--color-receita)] pl-4">
                            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">
                                Encerramento do Contrato (Opcional)
                            </label>
                            <input
                                type="date"
                                value={fixedEndDate}
                                onChange={(e) => setFixedEndDate(e.target.value)}
                                className="w-full sm:w-1/2 px-5 py-3 border-2 border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm font-bold text-[var(--text-primary)] focus:border-[var(--color-receita)] outline-none min-h-[50px]"
                            />
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-[var(--border-color)] mt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[var(--color-receita)] text-white hover:opacity-90 font-black text-lg py-5 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.99]"
                    >
                        {isSubmitting ? 'Processando transação...' : (initialData ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR ENTRADA')}
                    </button>
                </div>
            </div>
        </form>
    );
}
