import { useMemo, useRef, useState } from 'react';
import { Upload, FileUp, CheckSquare, Square, AlertTriangle, Loader2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../utils/supabase';
import { formatCurrency } from '../utils/format';
import { inferCategoryName } from '../utils/categoriesMap';
import { parseStatement, type ImportedTx } from '../utils/statementImport';

interface Row extends ImportedTx {
    key: string;
    selected: boolean;
    duplicate: boolean;
    categoryId: string;
}

// Importa extrato do banco (OFX ou CSV) para não lançar tudo à mão
export default function Importar() {
    const { transactions, categories, accounts, creditCards, refreshData } = useFinance();
    const { user } = useAuth();
    const { showToast } = useNotification();
    const inputRef = useRef<HTMLInputElement>(null);
    const [rows, setRows] = useState<Row[]>([]);
    const [fileName, setFileName] = useState('');
    const [destination, setDestination] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    const findCategory = (description: string, type: ImportedTx['type']) => {
        const name = inferCategoryName(description, type).toLowerCase();
        return categories.find(c => c.name.trim().toLowerCase() === name && (c.type === type || !c.type))?.id || '';
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        // Extratos de bancos brasileiros às vezes vêm em Latin-1 em vez de UTF-8
        const buffer = await file.arrayBuffer();
        let text = new TextDecoder('utf-8').decode(buffer);
        if (text.includes('�')) text = new TextDecoder('iso-8859-1').decode(buffer);

        const parsed = parseStatement(file.name, text);
        if (parsed.length === 0) {
            setRows([]);
            return showToast('Não encontrei lançamentos nesse arquivo. Use o extrato em OFX ou CSV do seu banco.', 'error');
        }

        const newRows = parsed.map((t, i) => {
            // Já existe lançamento igual (mesma data, valor e tipo)? Marca como provável duplicado
            const duplicate = transactions.some(x => x.date === t.date && x.type === t.type && Math.abs(x.amount - t.amount) < 0.01);
            return { ...t, key: `${i}`, selected: !duplicate, duplicate, categoryId: findCategory(t.description, t.type) };
        });
        setRows(newRows);
        setFileName(file.name);
    };

    const selected = rows.filter(r => r.selected);
    const totals = useMemo(() => ({
        expense: selected.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0),
        revenue: selected.filter(r => r.type === 'revenue').reduce((s, r) => s + r.amount, 0),
    }), [selected]);

    const update = (key: string, patch: Partial<Row>) => setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));
    const toggleAll = () => {
        const allSelected = rows.every(r => r.selected);
        setRows(rs => rs.map(r => ({ ...r, selected: !allSelected })));
    };

    const handleImport = async () => {
        if (!user) return;
        if (!destination) return showToast('Escolha de qual conta ou cartão é esse extrato.', 'error');
        if (selected.length === 0) return showToast('Nenhum lançamento selecionado.', 'error');

        const [kind, id] = destination.split(':');
        const isCard = kind === 'card';
        const payload = selected.map(r => ({
            description: r.description,
            amount: r.amount,
            date: r.date,
            type: r.type,
            category_id: r.categoryId || null,
            account_id: isCard ? null : id,
            credit_card_id: isCard ? id : null,
            payment_method: isCard ? 'cartao_credito' : null,
            is_paid: !isCard,
            is_fixed: false,
            installments: 1,
            user_id: user.id,
        }));

        setIsImporting(true);
        try {
            for (let i = 0; i < payload.length; i += 100) {
                const { error } = await supabase.from('transactions').insert(payload.slice(i, i + 100));
                if (error) throw error;
            }
            await refreshData();
            showToast(`${payload.length} lançamentos importados!`, 'success');
            setRows([]);
            setFileName('');
        } catch (error) {
            console.error('Error importing statement:', error);
            showToast('Erro ao importar. Nenhum lançamento a mais foi gravado depois do erro.', 'error');
        } finally {
            setIsImporting(false);
        }
    };

    const expenseCats = categories.filter(c => c.type === 'expense' || !c.type);
    const revenueCats = categories.filter(c => c.type === 'revenue' || !c.type);

    return (
        <div className="flex flex-col gap-6 pb-24 lg:pb-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl"><FileUp size={24} /></div>
                <div>
                    <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Importar Extrato</h1>
                    <p className="text-sm text-[var(--text-secondary)] font-medium">Traga os lançamentos do banco em OFX ou CSV, sem digitar um por um.</p>
                </div>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 flex flex-col gap-4">
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    No app do seu banco, procure <strong className="text-[var(--text-primary)]">Extrato → Exportar</strong> e escolha <strong className="text-[var(--text-primary)]">OFX</strong> (Money/Quicken) ou <strong className="text-[var(--text-primary)]">CSV</strong>.
                    No Nubank: Extrato → ícone de compartilhar → "Exportar extrato" (conta) ou Fatura → "Exportar fatura" (cartão).
                </p>
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-indigo-500/40 text-indigo-500 font-black hover:bg-indigo-500/5"
                >
                    <Upload size={20} /> {fileName ? `Trocar arquivo (${fileName})` : 'Escolher arquivo do extrato'}
                </button>
                <input ref={inputRef} type="file" accept=".ofx,.csv,.txt,text/csv,application/x-ofx" onChange={handleFile} className="hidden" />
            </div>

            {rows.length > 0 && (
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-end gap-4">
                        <div className="flex-1">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-1.5">Esse extrato é de</label>
                            <select
                                value={destination}
                                onChange={e => setDestination(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm font-bold text-[var(--text-primary)] outline-none focus:border-indigo-500"
                            >
                                <option value="">Escolha a conta ou cartão...</option>
                                <optgroup label="Contas">
                                    {accounts.map(a => <option key={a.id} value={`account:${a.id}`}>{a.name}</option>)}
                                </optgroup>
                                {creditCards.length > 0 && (
                                    <optgroup label="Cartões de crédito">
                                        {creditCards.map(c => <option key={c.id} value={`card:${c.id}`}>{c.name}</option>)}
                                    </optgroup>
                                )}
                            </select>
                        </div>
                        <div className="text-sm text-[var(--text-secondary)] font-medium">
                            {selected.length} de {rows.length} selecionados ·{' '}
                            <span className="text-[var(--color-despesa)] font-bold">-{formatCurrency(totals.expense)}</span>{' '}
                            <span className="text-[var(--color-receita)] font-bold">+{formatCurrency(totals.revenue)}</span>
                        </div>
                    </div>

                    {rows.some(r => r.duplicate) && (
                        <p className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                            Os lançamentos marcados como "já existe" têm a mesma data e valor de algo que você já lançou. Eles vêm desmarcados para não duplicar.
                        </p>
                    )}

                    <button type="button" onClick={toggleAll} className="self-start flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        {rows.every(r => r.selected) ? <CheckSquare size={16} /> : <Square size={16} />} Marcar / desmarcar todos
                    </button>

                    <div className="flex flex-col divide-y divide-[var(--border-color)] max-h-[60vh] overflow-y-auto -mx-2">
                        {rows.map(r => (
                            <div key={r.key} className={`flex items-center gap-3 px-2 py-3 ${r.selected ? '' : 'opacity-50'}`}>
                                <button type="button" onClick={() => update(r.key, { selected: !r.selected })} className="text-indigo-500 shrink-0">
                                    {r.selected ? <CheckSquare size={20} /> : <Square size={20} />}
                                </button>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-[var(--text-primary)] truncate">{r.description}</p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <span className="text-[11px] text-[var(--text-secondary)] font-medium">{r.date.split('-').reverse().join('/')}</span>
                                        {r.duplicate && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">já existe</span>}
                                        <select
                                            value={r.categoryId}
                                            onChange={e => update(r.key, { categoryId: e.target.value })}
                                            className="text-[11px] font-bold px-2 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] outline-none max-w-[170px]"
                                        >
                                            <option value="">Sem categoria</option>
                                            {(r.type === 'expense' ? expenseCats : revenueCats).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <span className={`font-black text-sm whitespace-nowrap ${r.type === 'expense' ? 'text-[var(--text-primary)]' : 'text-[var(--color-receita)]'}`}>
                                    {r.type === 'expense' ? '-' : '+'}{formatCurrency(r.amount)}
                                </span>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={handleImport}
                        disabled={isImporting || selected.length === 0}
                        className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isImporting ? <><Loader2 size={20} className="animate-spin" /> Importando...</> : `Importar ${selected.length} lançamentos`}
                    </button>
                </div>
            )}
        </div>
    );
}
