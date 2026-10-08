import { useMemo, useState } from 'react';
import { Gauge, Pencil, Check, AlertTriangle } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useNotification } from '../context/NotificationContext';
import { useUserPrefs } from '../utils/userPrefs';
import { budgetStatuses, spentByCategory } from '../utils/budgets';
import { formatCurrency } from '../utils/format';

const LEVEL_STYLE = {
    ok: { bar: 'bg-emerald-500', text: 'text-[var(--text-secondary)]' },
    warn: { bar: 'bg-amber-500', text: 'text-amber-500' },
    over: { bar: 'bg-rose-500', text: 'text-rose-500' },
};

// Orçamento mensal por categoria com alerta aos 80% e ao estourar
export default function BudgetCard() {
    const { transactions, categories, categoryMap, selectedMonth, selectedYear } = useFinance();
    const { prefs, savePrefs } = useUserPrefs();
    const { showToast } = useNotification();
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    const period = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    const statuses = useMemo(
        () => budgetStatuses(prefs.budgets, transactions, period, id => categoryMap[id]?.name),
        [prefs.budgets, transactions, period, categoryMap],
    );

    const expenseCategories = useMemo(() => {
        const spent = spentByCategory(transactions, period);
        return categories
            .filter(c => c.type === 'expense' || !c.type)
            .sort((a, b) => (spent[b.id] || 0) - (spent[a.id] || 0));
    }, [categories, transactions, period]);

    const startEditing = () => {
        const initial: Record<string, string> = {};
        Object.entries(prefs.budgets || {}).forEach(([id, v]) => { initial[id] = String(v); });
        setDraft(initial);
        setIsEditing(true);
    };

    const save = async () => {
        const budgets: Record<string, number> = {};
        Object.entries(draft).forEach(([id, v]) => {
            const value = parseFloat(v.replace(',', '.'));
            if (value > 0) budgets[id] = value;
        });
        setIsSaving(true);
        try {
            await savePrefs({ budgets });
            showToast('Orçamentos salvos!', 'success');
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving budgets:', error);
            showToast('Não foi possível salvar os orçamentos.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const alerts = statuses.filter(s => s.level !== 'ok').length;

    return (
        <div className="rounded-[2rem] p-6 bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                        <Gauge size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-[var(--text-primary)] uppercase tracking-wide text-sm">Orçamento do Mês</h3>
                        {alerts > 0 && !isEditing && (
                            <p className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
                                <AlertTriangle size={12} /> {alerts} {alerts === 1 ? 'categoria precisa' : 'categorias precisam'} de atenção
                            </p>
                        )}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={isEditing ? save : startEditing}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border-2 border-[var(--border-color)] text-[var(--text-primary)] hover:border-amber-500 disabled:opacity-50"
                >
                    {isEditing ? <><Check size={14} /> {isSaving ? 'Salvando...' : 'Salvar'}</> : <><Pencil size={14} /> Definir limites</>}
                </button>
            </div>

            {isEditing ? (
                <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
                    <p className="text-[11px] text-[var(--text-secondary)] mb-1">Limite mensal por categoria. Deixe vazio para não controlar.</p>
                    {expenseCategories.map(c => (
                        <label key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                            <span className="text-sm font-bold text-[var(--text-primary)] truncate">{c.name}</span>
                            <div className="relative w-32 shrink-0">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)]">R$</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={draft[c.id] || ''}
                                    onChange={e => setDraft(d => ({ ...d, [c.id]: e.target.value.replace(/[^\d.,]/g, '') }))}
                                    placeholder="—"
                                    className="w-full pl-9 pr-3 py-2 rounded-lg border-2 border-[var(--border-color)] bg-[var(--bg-card)] text-sm font-bold text-[var(--text-primary)] focus:border-amber-500 outline-none"
                                />
                            </div>
                        </label>
                    ))}
                </div>
            ) : statuses.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)] text-center py-4">
                    Defina um limite por categoria (ex: R$ 800 em combustível) e o app avisa aos 80%.
                </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {statuses.map(s => {
                        const style = LEVEL_STYLE[s.level];
                        return (
                            <div key={s.categoryId} className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                                <div className="flex items-center justify-between gap-2 text-sm">
                                    <span className="font-bold text-[var(--text-primary)] truncate">{s.name}</span>
                                    <span className={`text-xs font-black ${style.text}`}>{s.percent.toFixed(0)}%</span>
                                </div>
                                <div className="h-2 my-2 bg-[var(--bg-card)] rounded-full overflow-hidden">
                                    <div className={`h-full ${style.bar} rounded-full transition-all`} style={{ width: `${Math.min(100, s.percent)}%` }} />
                                </div>
                                <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                                    {formatCurrency(s.spent)} de {formatCurrency(s.limit)}
                                    {s.level === 'over'
                                        ? <span className="text-rose-500 font-bold"> · estourou {formatCurrency(s.spent - s.limit)}</span>
                                        : <span> · resta {formatCurrency(s.limit - s.spent)}</span>}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
