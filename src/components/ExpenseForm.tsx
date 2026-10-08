import { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { inferCategoryName, isCarRelated, isFuelRelated } from '../utils/categoriesMap';
import { formatCurrencyInput, parseCurrencyToFloat } from '../utils/currencyMask';
import { todayLocalISO } from '../utils/format';
import { useNotification } from '../context/NotificationContext';
import { TrendingDown, CreditCard, Landmark, Calendar, Repeat, CheckCircle2, Car, Fuel, Map, RotateCcw } from 'lucide-react';
import { type FuelType, FUEL_TYPES, detectFuelType, hasResetCycleTag, buildFuelDescription, cleanFuelDescription } from '../utils/fuelUtils';
import type { FuelPhotoReading } from '../utils/fuelPhotoReader';
import FuelPhotoButton from './FuelPhotoButton';

export interface FuelPrefill {
    reading: FuelPhotoReading;
    vehicleId?: string;
}

interface ExpenseFormProps {
    onSuccess?: () => void;
    initialData?: any;
    fuelPrefill?: FuelPrefill;
}

export default function ExpenseForm({ onSuccess, initialData, fuelPrefill }: ExpenseFormProps) {
    const { categories, accounts, creditCards, vehicles, transactions, refreshData } = useFinance();
    const { user } = useAuth();
    const { showToast } = useNotification();

    const [description, setDescription] = useState(initialData?.description ? cleanFuelDescription(initialData.description) : '');
    const [fuelType, setFuelType] = useState<FuelType>(() => detectFuelType(initialData?.description));
    const [isResetCycle, setIsResetCycle] = useState<boolean>(() => hasResetCycleTag(initialData?.description));
    const [amount, setAmount] = useState(initialData?.amount !== undefined && initialData?.amount !== null ? formatCurrencyInput((initialData.amount * 100).toFixed(0)) : '');
    const [date, setDate] = useState(initialData?.date ? initialData.date.split('T')[0] : todayLocalISO());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const descriptionRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (descriptionRef.current && !initialData) {
            descriptionRef.current.focus();
        }
    }, [initialData]);

    const [paymentMethod, setPaymentMethod] = useState(initialData?.payment_method || '');
    const [accountId, setAccountId] = useState(initialData?.account_id || '');
    const [creditCardId, setCreditCardId] = useState(initialData?.credit_card_id || '');
    const [isPaid, setIsPaid] = useState(initialData?.is_paid ?? true);
    const [isFixed, setIsFixed] = useState(initialData?.is_fixed || false);
    const [fixedEndDate, setFixedEndDate] = useState(initialData?.fixed_end_date ? initialData.fixed_end_date.split('T')[0] : '');
    const [installments, setInstallments] = useState(initialData?.installments ? String(initialData.installments) : '1');
    const [vehicleId, setVehicleId] = useState(initialData?.vehicle_id || '');
    const [mileage, setMileage] = useState(initialData?.mileage ? String(initialData.mileage) : '');
    const [liters, setLiters] = useState(initialData?.liters ? String(initialData.liters) : '');
    const [categoryId, setCategoryId] = useState(initialData?.category_id || '');
    const [isManualCategory, setIsManualCategory] = useState(!!initialData);

    // Preenche o formulário com o que foi lido nas fotos da bomba/painel
    const applyFuelReading = (reading: FuelPhotoReading, preferredVehicleId?: string) => {
        if (!cleanFuelDescription(description) || !isFuelRelated(cleanFuelDescription(description), '')) {
            setDescription('Abastecimento');
        }
        if (reading.valor_total != null) setAmount(formatCurrencyInput((reading.valor_total * 100).toFixed(0)));
        if (reading.litros != null) setLiters(String(reading.litros));
        if (reading.odometro_km != null) setMileage(String(Math.round(reading.odometro_km)));
        if (reading.data_foto) setDate(reading.data_foto);

        const targetVehicleId = preferredVehicleId && preferredVehicleId !== 'all'
            ? preferredVehicleId
            : (vehicleId || (vehicles.length === 1 ? vehicles[0].id : ''));
        if (targetVehicleId) setVehicleId(targetVehicleId);

        // A foto lê só os números; o combustível vem do último abastecimento desse veículo
        const lastFuel = transactions
            .filter(t => (t.liters || 0) > 0 && (!targetVehicleId || t.vehicle_id === targetVehicleId))
            .sort((a, b) => (b.mileage || 0) - (a.mileage || 0) || b.date.localeCompare(a.date))[0];
        if (lastFuel) setFuelType(detectFuelType(lastFuel.description));

        const missing = [
            reading.odometro_km == null && 'KM',
            reading.litros == null && 'litros',
            reading.valor_total == null && 'valor',
        ].filter(Boolean);

        // Alerta se o KM lido for menor que o último registrado para o veículo (dígito lido errado)
        const lastMileage = Math.max(0, ...transactions
            .filter(t => t.mileage && (!targetVehicleId || t.vehicle_id === targetVehicleId) && t.id !== initialData?.id)
            .map(t => t.mileage as number));

        if (reading.odometro_km != null && lastMileage > 0 && reading.odometro_km < lastMileage) {
            showToast(`Confira o KM: ${reading.odometro_km.toLocaleString('pt-BR')} é menor que o último registro (${lastMileage.toLocaleString('pt-BR')}).`, 'error');
        } else if (missing.length > 0) {
            showToast(`Fotos lidas! Não encontrei: ${missing.join(', ')}. Complete manualmente.`, 'info');
        } else if (reading.observacoes) {
            showToast(`Fotos lidas — confira: ${reading.observacoes}`, 'info');
        } else {
            showToast('Fotos lidas! Confira os valores e escolha o pagamento.', 'success');
        }
    };

    const appliedPrefillRef = useRef<FuelPrefill | null>(null);
    useEffect(() => {
        if (fuelPrefill && appliedPrefillRef.current !== fuelPrefill) {
            appliedPrefillRef.current = fuelPrefill;
            applyFuelReading(fuelPrefill.reading, fuelPrefill.vehicleId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fuelPrefill]);

    const expenseCategories = useMemo(() => {
        return categories.filter(c => c.type === 'expense' || c.type === 'transference' || !c.type);
    }, [categories]);

    const recentDescriptions = useMemo(() => {
        return Array.from(new Set(
            transactions
                .filter(t => t.type === 'expense' && t.description)
                .map(t => t.description)
        ));
    }, [transactions]);

    // Sugerir categoria baseada na descrição
    useEffect(() => {
        if (!description || isManualCategory || initialData) return;
        
        const suggestedName = inferCategoryName(description, 'expense');
        const matched = expenseCategories.find(c => 
            c.name.toLowerCase() === suggestedName.toLowerCase()
        );
        
        if (matched) {
            setCategoryId(matched.id);
        }
    }, [description, expenseCategories, isManualCategory, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const isCarCreditOption = paymentMethod === 'cartao_credito';
        const isCashOption = paymentMethod === 'dinheiro';
        const hasOrigin = isCarCreditOption ? !!creditCardId : (isCashOption ? true : !!accountId);

        if (!description) return showToast('Informe o que você pagou!', 'error');
        if (!amount) return showToast('Informe o valor!', 'error');
        if (!date) return showToast('Informe a data!', 'error');
        if (!paymentMethod) return showToast('Selecione o método de pagamento!', 'error');
        if (!hasOrigin) {
            return showToast(isCarCreditOption ? 'Selecione o Cartão de Crédito!' : 'Selecione de qual Banco saiu o dinheiro!', 'error');
        }
        if (!user || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const numInstallments = parseInt(installments) || 1;
            const floatAmount = parseCurrencyToFloat(amount);
            const installmentAmount = floatAmount / numInstallments;
            let finalCategoryId = categoryId;
            const suggestedName = inferCategoryName(description, 'expense');
            const isCarExpense = isCarRelated(description, suggestedName);
            
            // Se ainda não tem ID (ex: categoria sugerida ainda não criada no banco deste usuário)
            if (!finalCategoryId || !finalCategoryId.trim()) {
                const existingCategory = expenseCategories.find(c => 
                    c.name.trim().toLowerCase() === suggestedName.toLowerCase()
                );
                
                if (existingCategory) {
                    finalCategoryId = existingCategory.id;
                } else {
                    try {
                        const { data: newCat, error: catError } = await supabase
                            .from('categories')
                            .insert({ name: suggestedName, type: 'expense', user_id: user?.id })
                            .select()
                            .maybeSingle();
                        if (!catError && newCat) finalCategoryId = newCat.id;
                    } catch (catErr) {
                        console.warn('Erro ao auto-criar categoria:', catErr);
                    }
                }

                // Fallback adicional: categoria 'Outros' ou a primeira disponível
                if (!finalCategoryId || !finalCategoryId.trim()) {
                    const fallbackCat = expenseCategories.find(c => c.name.toLowerCase().includes('outro')) || expenseCategories[0];
                    if (fallbackCat) {
                        finalCategoryId = fallbackCat.id;
                    }
                }
            }

            let finalAccountId = accountId;
            if (isCashOption && !finalAccountId) {
                const cashAccount = accounts.find(acc => 
                    acc.type === 'Dinheiro' ||
                    acc.name.toLowerCase().includes('dinheiro') || 
                    acc.name.toLowerCase().includes('mãos')
                );

                if (cashAccount) {
                    finalAccountId = cashAccount.id;
                } else {
                    try {
                        const { data: newAcc, error: accError } = await supabase
                            .from('accounts')
                            .insert({
                                name: 'Dinheiro em Mãos',
                                type: 'Dinheiro',
                                balance: 0,
                                user_id: user.id
                            })
                            .select()
                            .maybeSingle();
                        
                        if (!accError && newAcc) finalAccountId = newAcc.id;
                    } catch (accErr) {
                        console.warn('Não foi possível auto-criar conta Dinheiro em Mãos:', accErr);
                    }
                }
            }

            const cleanMileage = mileage ? parseFloat(String(mileage).replace(',', '.')) : null;
            const rawLiters = liters ? parseFloat(String(liters).replace(',', '.')) : null;

            // Só é abastecimento se a descrição/categoria indicar combustível (ignorando tags antigas) ou se houver litros informados.
            // Manutenção, pneu, IPVA etc. NÃO recebem tag de combustível mesmo com veículo selecionado.
            const baseDescription = cleanFuelDescription(description);
            const isFuelExpense = isCarExpense && (isFuelRelated(baseDescription, suggestedName) || (rawLiters !== null && !isNaN(rawLiters) && rawLiters > 0));
            const cleanLiters = isFuelExpense ? rawLiters : null;

            const finalDescription = isFuelExpense
                ? buildFuelDescription(description, fuelType, isResetCycle)
                : (isCarExpense ? (baseDescription || description) : description);

            const payload = {
                description: finalDescription,
                amount: initialData ? floatAmount : installmentAmount,
                date,
                type: initialData ? initialData.type : 'expense',
                category_id: (finalCategoryId && finalCategoryId.trim() !== '') ? finalCategoryId : null,
                account_id: (!isCarCreditOption && finalAccountId && finalAccountId.trim() !== '') ? finalAccountId : null,
                credit_card_id: (isCarCreditOption && creditCardId && creditCardId.trim() !== '') ? creditCardId : null,
                payment_method: paymentMethod || null,
                is_fixed: isFixed,
                fixed_end_date: (isFixed && fixedEndDate && fixedEndDate.trim() !== '') ? fixedEndDate : null,
                is_paid: isCarCreditOption ? false : isPaid,
                installments: initialData ? initialData.installments : numInstallments,
                vehicle_id: (isCarExpense && vehicleId && vehicleId.trim() !== '' && vehicleId !== 'all') ? vehicleId : null,
                mileage: (isCarExpense && cleanMileage !== null && !isNaN(cleanMileage) && cleanMileage > 0) ? cleanMileage : null,
                liters: (isCarExpense && cleanLiters !== null && !isNaN(cleanLiters) && cleanLiters > 0) ? cleanLiters : null,
                user_id: user?.id
            };

            const { error } = initialData?.id 
                ? await supabase.from('transactions').update(payload).eq('id', initialData.id)
                : await supabase.from('transactions').insert(payload);

            if (error) throw error;

            setDescription(''); setAmount(''); setDate(todayLocalISO());
            setPaymentMethod(''); setAccountId(''); setCreditCardId('');
            setIsPaid(true); setIsFixed(false); setFixedEndDate('');
            setInstallments('1'); setVehicleId(''); setMileage(''); setLiters('');
            setFuelType('gasolina'); setIsResetCycle(false);

            showToast(initialData ? 'Saída de recursos atualizada!' : 'Valor descontado com sucesso!', 'success');
            await refreshData();
            if (onSuccess) onSuccess();

        } catch (error: any) {
            console.error('Error adding expense:', error);
            let friendlyMsg = error?.message || 'Falha ao registrar saída.';
            if (error?.code === '22P02') {
                friendlyMsg = 'Formato inválido em um dos campos selecionados.';
            } else if (error?.code === '23514') {
                friendlyMsg = 'Dados inválidos para tipo de conta ou restrição cadastrada.';
            } else if (error?.code === '23503') {
                friendlyMsg = 'Conta, cartão ou categoria selecionada não foi encontrada.';
            }
            showToast(`Erro ao lançar despesa: ${friendlyMsg}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const tempMappedCat = inferCategoryName(description, 'expense');
    const isCarExpenseLocal = isCarRelated(description, tempMappedCat);
    const isFuelLocal = isCarExpenseLocal && isFuelRelated(cleanFuelDescription(description), tempMappedCat);

    return (
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20">
                    <TrendingDown size={24} />
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl font-black text-[var(--color-despesa)] tracking-tight">
                        {initialData ? 'Corrigir Lançamento' : 'Novo Gasto'}
                    </h2>
                    <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-0.5">Subtração de Capital</p>
                </div>
                <FuelPhotoButton
                    onResult={(reading) => applyFuelReading(reading)}
                    vehicleId={vehicleId}
                    label="Abastecimento por foto"
                    className="px-3 py-2.5 text-xs rounded-xl bg-[var(--color-carro)]/10 text-[var(--color-carro)] border-2 border-[var(--color-carro)]/30 hover:bg-[var(--color-carro)]/20"
                />
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl shadow-sm flex flex-col gap-5">
                {/* Descrição - MOVED TO TOP */}
                <div className="relative md:col-span-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">
                        Motivo Principal
                    </label>
                    <input
                        ref={descriptionRef}
                        type="text"
                        value={description}
                        onChange={(e) => {
                            const val = e.target.value;
                            setDescription(val);
                            setShowSuggestions(true);
                            const lower = val.toLowerCase();
                            if (lower.includes('etanol') || lower.includes('álcool') || lower.includes('alcool')) {
                                setFuelType('etanol');
                            } else if (lower.includes('diesel')) {
                                setFuelType('diesel');
                            } else if (lower.includes('gnv')) {
                                setFuelType('gnv');
                            } else if (lower.includes('gasolina')) {
                                setFuelType('gasolina');
                            }
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        className="w-full px-5 py-4 border-2 border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)] text-lg font-bold text-[var(--text-primary)] focus:border-[var(--color-despesa)] focus:ring-4 focus:ring-rose-500/10 outline-none transition-all placeholder-[var(--text-muted)]"
                        placeholder="O que você pagou/comprou?"
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

                {/* Master Input Amount - MOVED TO BELOW DESCRIPTION */}
                <div className="relative group">
                    <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">
                        Quanto custou?
                    </label>
                    <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-[var(--color-despesa)] opacity-70 group-focus-within:opacity-100 transition-opacity">R$</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={amount}
                            onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
                            className="w-full pl-20 pr-6 py-5 text-4xl font-black border-2 border-[var(--border-color)] rounded-[1.5rem] bg-[var(--bg-secondary)] text-[var(--color-despesa)] focus:border-[var(--color-despesa)] focus:ring-4 focus:ring-rose-500/10 outline-none transition-all placeholder-[var(--color-despesa)]/20"
                            placeholder="0,00"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Forma de Pagamento */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">
                            Método
                        </label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full px-5 py-4 border-2 border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)] text-lg font-bold text-[var(--text-primary)] focus:border-[var(--color-despesa)] outline-none transition-all appearance-none cursor-pointer"
                            required
                        >
                            <option value="" disabled>Como você pagou?</option>
                            <option value="pix">Transferência PIX</option>
                            <option value="dinheiro">Dinheiro Físico</option>
                            <option value="cartao_debito">Cartão de Débito</option>
                            <option value="cartao_credito">Cartão de Crédito</option>
                            <option value="boleto">Boleto Bancário</option>
                        </select>
                    </div>

                    {/* Origem */}
                    {paymentMethod === 'cartao_credito' ? (
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">
                                <CreditCard size={14}/> Qual Cartão?
                            </label>
                            <select
                                value={creditCardId}
                                onChange={(e) => setCreditCardId(e.target.value)}
                                className="w-full px-5 py-4 border-2 border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)] text-lg font-bold text-[var(--color-text)] focus:border-[var(--color-despesa)] outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="" disabled>Selecione o limite...</option>
                                {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    ) : paymentMethod !== 'dinheiro' && (
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">
                                <Landmark size={14}/> De onde saiu o dinheiro?
                            </label>
                            <select
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                                className="w-full px-5 py-4 border-2 border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)] text-lg font-bold text-[var(--text-primary)] focus:border-[var(--color-despesa)] outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="" disabled>Selecione seu banco...</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Data */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">
                            <Calendar size={14}/> Data do Gasto
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-5 py-4 border-2 border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)] text-lg font-bold text-[var(--text-primary)] focus:border-[var(--color-despesa)] outline-none transition-all min-h-[60px]"
                            required
                        />
                    </div>

                    {/* Parcelas */}
                    <div>
                        <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">
                            Dividir (Parcelas)
                        </label>
                        <input
                            type="number"
                            min="1" max="72"
                            value={installments}
                            onChange={(e) => setInstallments(e.target.value)}
                            className="w-full px-5 py-4 border-2 border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)] text-lg font-bold text-[var(--text-primary)] focus:border-[var(--color-despesa)] outline-none transition-all disabled:opacity-50 min-h-[60px]"
                            disabled={(paymentMethod !== 'cartao_credito' && isFixed) || !!initialData}
                        />
                    </div>
                </div>

                {/* Categoria - NEW FIELD */}
                <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">
                        Classificação / Categoria
                    </label>
                    <select
                        value={categoryId}
                        onChange={(e) => {
                            setCategoryId(e.target.value);
                            setIsManualCategory(true);
                        }}
                        className="w-full px-5 py-4 border-2 border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)] text-lg font-bold text-[var(--text-primary)] focus:border-[var(--color-despesa)] outline-none transition-all appearance-none cursor-pointer"
                    >
                        <option value="">Auto-detectar ou selecionar...</option>
                        {expenseCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-2 px-1 font-medium italic">
                        * O sistema agrupa automaticamente, mas você pode mudar para manter tudo resumido.
                    </p>
                </div>

                {/* Veículo (Car Details se aplicável) */}
                {isCarExpenseLocal && (
                    <div className="bg-[var(--color-carro)]/5 border-2 border-[var(--color-carro)]/30 rounded-2xl p-5 mt-2 overflow-hidden relative group">
                        <div className="absolute right-[-20px] top-[-20px] opacity-[0.03] pointer-events-none transition-all group-hover:opacity-10 group-hover:scale-110">
                            <Car size={150} />
                        </div>
                        
                        <div className="flex items-center justify-between gap-2 mb-4 relative z-10">
                            <div className="flex items-center gap-2">
                                <Car size={18} className="text-[var(--color-carro)]" />
                                <span className="font-black text-[var(--color-carro)] tracking-tight uppercase text-sm">Automação de Frota</span>
                            </div>
                            <span className="text-[10px] bg-[var(--bg-card)] border border-[var(--border-color)] px-2.5 py-1 rounded-full font-bold text-[var(--text-secondary)] uppercase">
                                Controle Flex & Médias
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4 relative z-10">
                            {vehicles.length > 0 && (
                                <div>
                                    <label className="flex text-[10px] font-bold text-[var(--color-carro)] uppercase tracking-widest mb-1.5 px-1">
                                        Veículo Reabastecido/Manutenção
                                    </label>
                                    <select
                                        value={vehicleId}
                                        onChange={(e) => setVehicleId(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-[var(--color-carro)]/20 rounded-xl bg-[var(--bg-card)] text-sm font-bold text-[var(--text-primary)] focus:border-[var(--color-carro)] outline-none appearance-none"
                                    >
                                        <option value="">(Nenhum Associado)</option>
                                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>)}
                                    </select>
                                </div>
                            )}

                            {/* Seletor de Tipo de Combustível */}
                            {isFuelLocal && (
                            <div>
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--color-carro)] uppercase tracking-widest mb-1.5 px-1">
                                    <Fuel size={12}/> Tipo de Combustível Utilizado
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {(['gasolina', 'etanol', 'diesel', 'gnv'] as FuelType[]).map((type) => {
                                        const config = FUEL_TYPES[type];
                                        const isSelected = fuelType === type;
                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setFuelType(type)}
                                                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border-2 transition-all cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-[var(--color-carro)] text-white border-[var(--color-carro)] shadow-md shadow-[var(--color-carro)]/20 scale-[1.02]'
                                                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--color-carro)]/40 hover:text-[var(--text-primary)]'
                                                }`}
                                            >
                                                <span>{config.icon}</span>
                                                <span>{config.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--color-carro)] uppercase tracking-widest mb-1.5 px-1">
                                        <Map size={12}/> KM Atual (Odômetro)
                                    </label>
                                    <input
                                        type="number" min="0" step="0.1"
                                        value={mileage}
                                        onChange={(e) => setMileage(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-[var(--color-carro)]/20 rounded-xl bg-[var(--bg-card)] text-sm font-bold text-[var(--text-primary)] focus:border-[var(--color-carro)] outline-none"
                                        placeholder="Ex: 50200"
                                    />
                                </div>
                                {isFuelLocal && (
                                <div>
                                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--color-carro)] uppercase tracking-widest mb-1.5 px-1">
                                        <Fuel size={12}/> Volume Abastecido
                                    </label>
                                    <input
                                        type="number" min="0" step="0.01"
                                        value={liters}
                                        onChange={(e) => setLiters(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-[var(--color-carro)]/20 rounded-xl bg-[var(--bg-card)] text-sm font-bold text-[var(--text-primary)] focus:border-[var(--color-carro)] outline-none"
                                        placeholder="Litros Ex: 40"
                                    />
                                </div>
                                )}
                            </div>

                            {/* Reset / Novo Ciclo de Média */}
                            {isFuelLocal && (
                            <div className="pt-2 border-t border-[var(--color-carro)]/15">
                                <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                    isResetCycle
                                        ? 'bg-amber-500/10 border-amber-500/30 text-[var(--text-primary)]'
                                        : 'bg-[var(--bg-card)]/50 border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
                                }`}>
                                    <input
                                        type="checkbox"
                                        checked={isResetCycle}
                                        onChange={(e) => setIsResetCycle(e.target.checked)}
                                        className="w-4 h-4 mt-0.5 text-amber-500 rounded border-[var(--border-color)] focus:ring-0 cursor-pointer"
                                    />
                                    <div className="flex-1 text-xs">
                                        <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                                            <RotateCcw size={13} className={isResetCycle ? 'text-amber-500' : 'text-[var(--text-muted)]'} />
                                            <span>Reiniciar ciclo de média (odômetro saltou ou esqueci registros)</span>
                                        </div>
                                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                                            Marque se houve um intervalo grande ou abastecimentos que não foram anotados. Isso evita que o cálculo gere uma média irreal (ex: 50 km/l).
                                        </p>
                                    </div>
                                </label>
                            </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Custom Toggles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <label className={`flex items-center justify-between p-4 border-2 rounded-2xl transition-all ${paymentMethod === 'cartao_credito' ? 'opacity-50 cursor-not-allowed bg-[var(--bg-secondary)] border-[var(--border-color)]' : isPaid ? 'border-[var(--color-despesa)] bg-rose-500/5 cursor-pointer' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] cursor-pointer'}`}>
                        <div className="flex items-center gap-3">
                            <CheckCircle2 size={20} className={paymentMethod === 'cartao_credito' ? 'text-[var(--text-muted)] line-through' : isPaid ? 'text-[var(--color-despesa)]' : 'text-[var(--text-muted)]'} />
                            <span className={`font-bold text-sm ${paymentMethod === 'cartao_credito' ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>Gasto já pago / debitado?</span>
                        </div>
                        <input
                            type="checkbox"
                            checked={paymentMethod === 'cartao_credito' ? false : isPaid}
                            disabled={paymentMethod === 'cartao_credito'}
                            onChange={(e) => setIsPaid(e.target.checked)}
                            className="w-5 h-5 text-[var(--color-despesa)] border-2 border-[var(--border-color)] rounded-md focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                    </label>
                    
                    <div className="flex flex-col gap-2">
                        <label className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all ${isFixed ? 'border-[var(--color-despesa)] bg-rose-500/5' : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'}`}>
                            <div className="flex items-center gap-3">
                                <Repeat size={20} className={isFixed ? 'text-[var(--color-despesa)]' : 'text-[var(--text-muted)]'} />
                                <span className="font-bold text-[var(--text-primary)] text-sm">Assinatura Mensal Fixa</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={isFixed}
                                onChange={(e) => setIsFixed(e.target.checked)}
                                className="w-5 h-5 text-[var(--color-despesa)] border-2 border-[var(--border-color)] rounded-md focus:ring-0 cursor-pointer"
                            />
                        </label>
                        {isFixed && (
                             <div className="animate-fade-in pl-4 border-l-4 border-[var(--color-despesa)] mt-2">
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">
                                    Vencimento Final (Opcional)
                                </label>
                                <input
                                    type="date"
                                    value={fixedEndDate}
                                    onChange={(e) => setFixedEndDate(e.target.value)}
                                    className="w-full px-5 py-3 border-2 border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm font-bold text-[var(--text-primary)] focus:border-[var(--color-despesa)] outline-none min-h-[50px]"
                                />
                             </div>
                        )}
                    </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-color)] mt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[var(--color-despesa)] text-white hover:opacity-90 font-black text-lg py-5 rounded-2xl transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.99]"
                    >
                        {isSubmitting ? 'Debitando da conta...' : (initialData ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR DESPESA')}
                    </button>
                </div>
            </div>
        </form>
    );
}
