import { useMemo } from 'react';
import { Printer, FileBarChart } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useFinance } from '../context/FinanceContext';
import PeriodFilter from '../components/PeriodFilter';
import { formatCurrency } from '../utils/format';
import { useUserPrefs } from '../utils/userPrefs';
import { isFuelRelated } from '../utils/categoriesMap';
import { calculateFuelMetrics, cleanFuelDescription } from '../utils/fuelUtils';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Relatório mensal pronto para imprimir ou salvar em PDF (pelo "Imprimir" do navegador)
export default function Relatorio() {
    const { transactions, accounts, categoryMap, vehicles, goals, selectedMonth, selectedYear } = useFinance();
    const { prefs } = useUserPrefs();
    const period = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    const monthTx = useMemo(() => transactions.filter(t => t.date.startsWith(period)), [transactions, period]);

    const summary = useMemo(() => {
        const income = monthTx.filter(t => t.type === 'revenue').reduce((s, t) => s + t.amount, 0);
        const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        return { income, expense, result: income - expense, balance: accounts.reduce((s, a) => s + a.balance, 0) };
    }, [monthTx, accounts]);

    const byCategory = useMemo(() => {
        const map: Record<string, { name: string; value: number; limit?: number }> = {};
        monthTx.filter(t => t.type === 'expense').forEach(t => {
            const id = t.category_id || 'none';
            if (!map[id]) map[id] = { name: categoryMap[id]?.name || 'Sem categoria', value: 0, limit: prefs.budgets?.[id] };
            map[id].value += t.amount;
        });
        return Object.values(map).sort((a, b) => b.value - a.value);
    }, [monthTx, categoryMap, prefs.budgets]);

    const topExpenses = useMemo(() => monthTx.filter(t => t.type === 'expense').sort((a, b) => b.amount - a.amount).slice(0, 10), [monthTx]);

    const vehicleStats = useMemo(() => vehicles.map(v => {
        const vTx = transactions.filter(t => t.type === 'expense' && t.vehicle_id === v.id);
        const isFuel = (t: typeof vTx[number]) => (t.liters || 0) > 0 || isFuelRelated(cleanFuelDescription(t.description), categoryMap[t.category_id || '']?.name || '');
        const fuelSorted = vTx.filter(t => isFuel(t) && (t.mileage || 0) > 0).sort((a, b) => (a.mileage || 0) - (b.mileage || 0));
        const segments = calculateFuelMetrics(fuelSorted).segments.filter(s => s.date.startsWith(period) && !s.isGapOutlier && s.dist > 0 && s.liters > 0);
        const km = segments.reduce((s, x) => s + x.dist, 0);
        const liters = segments.reduce((s, x) => s + x.liters, 0);
        const monthV = vTx.filter(t => t.date.startsWith(period));
        const fuel = monthV.filter(isFuel).reduce((s, t) => s + t.amount, 0);
        const other = monthV.filter(t => !isFuel(t)).reduce((s, t) => s + t.amount, 0);
        return { id: v.id, name: v.name, plate: v.plate, fuel, other, km, kml: km > 0 && liters > 0 ? km / liters : 0, cpk: km > 0 ? fuel / km : 0 };
    }).filter(v => v.fuel + v.other > 0), [vehicles, transactions, categoryMap, period]);

    const handlePrint = () => window.print();
    const isNative = Capacitor.isNativePlatform();

    const card = 'print-card bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6';
    const th = 'text-left text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pb-2';

    return (
        <div className="print-area flex flex-col gap-6 pb-24 lg:pb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl no-print"><FileBarChart size={24} /></div>
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Relatório de {MONTHS[selectedMonth]} {selectedYear}</h1>
                        <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-widest">ControleBR · gerado em {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>
                <div className="no-print flex items-center gap-3">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl py-1 px-1"><PeriodFilter /></div>
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white font-black shadow-md">
                        <Printer size={18} /> Salvar PDF
                    </button>
                </div>
            </div>
            {isNative && (
                <p className="no-print text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                    No app Android a impressão pode não abrir. Para salvar em PDF, abra o ControleBR pelo navegador e use este botão.
                </p>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    ['Receitas', summary.income, 'text-[var(--color-receita)]'],
                    ['Despesas', summary.expense, 'text-[var(--color-despesa)]'],
                    ['Resultado do mês', summary.result, summary.result >= 0 ? 'text-[var(--color-receita)]' : 'text-[var(--color-despesa)]'],
                    ['Saldo em contas', summary.balance, 'text-[var(--text-primary)]'],
                ].map(([label, value, color]) => (
                    <div key={label as string} className={card}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">{label}</p>
                        <p className={`text-2xl font-black tracking-tight mt-1 ${color}`}>{formatCurrency(value as number)}</p>
                    </div>
                ))}
            </div>

            <div className={card}>
                <h2 className="font-black text-[var(--text-primary)] uppercase tracking-wide text-sm mb-4">Gastos por categoria</h2>
                {byCategory.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">Sem gastos neste mês.</p> : (
                    <table className="w-full text-sm">
                        <thead><tr><th className={th}>Categoria</th><th className={`${th} text-right`}>Valor</th><th className={`${th} text-right`}>% do total</th><th className={`${th} text-right hidden sm:table-cell`}>Orçamento</th></tr></thead>
                        <tbody>
                            {byCategory.map(c => {
                                const share = summary.expense > 0 ? (c.value / summary.expense) * 100 : 0;
                                return (
                                    <tr key={c.name} className="border-t border-[var(--border-color)]">
                                        <td className="py-2.5 font-bold text-[var(--text-primary)]">
                                            {c.name}
                                            <div className="h-1.5 mt-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden max-w-[220px]">
                                                <div className="print-bar h-full bg-indigo-500 rounded-full" style={{ width: `${share}%` }} />
                                            </div>
                                        </td>
                                        <td className="py-2.5 text-right font-bold text-[var(--text-primary)]">{formatCurrency(c.value)}</td>
                                        <td className="py-2.5 text-right text-[var(--text-secondary)]">{share.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</td>
                                        <td className={`py-2.5 text-right hidden sm:table-cell ${c.limit && c.value > c.limit ? 'text-rose-500 font-bold' : 'text-[var(--text-secondary)]'}`}>
                                            {c.limit ? `${((c.value / c.limit) * 100).toFixed(0)}% de ${formatCurrency(c.limit)}` : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {vehicleStats.length > 0 && (
                <div className={card}>
                    <h2 className="font-black text-[var(--text-primary)] uppercase tracking-wide text-sm mb-4">Veículos</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {vehicleStats.map(v => (
                            <div key={v.id} className="print-card p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-sm">
                                <p className="font-black text-[var(--text-primary)]">{v.name} <span className="text-[var(--text-secondary)] font-bold">({v.plate})</span></p>
                                <div className="grid grid-cols-2 gap-y-1 mt-2 text-[var(--text-secondary)]">
                                    <span>Combustível</span><span className="text-right font-bold text-[var(--text-primary)]">{formatCurrency(v.fuel)}</span>
                                    <span>Manutenção/outros</span><span className="text-right font-bold text-[var(--text-primary)]">{formatCurrency(v.other)}</span>
                                    <span>KM rodados (medidos)</span><span className="text-right font-bold text-[var(--text-primary)]">{v.km > 0 ? `${v.km.toLocaleString('pt-BR')} km` : '—'}</span>
                                    <span>Média</span><span className="text-right font-bold text-[var(--text-primary)]">{v.kml > 0 ? `${v.kml.toFixed(1)} km/l` : '—'}</span>
                                    <span>Custo por km</span><span className="text-right font-bold text-[var(--text-primary)]">{v.cpk > 0 ? formatCurrency(v.cpk) : '—'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className={card}>
                <h2 className="font-black text-[var(--text-primary)] uppercase tracking-wide text-sm mb-4">10 maiores gastos</h2>
                {topExpenses.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">Sem gastos neste mês.</p> : (
                    <table className="w-full text-sm">
                        <thead><tr><th className={th}>Data</th><th className={th}>Descrição</th><th className={`${th} text-right`}>Valor</th></tr></thead>
                        <tbody>
                            {topExpenses.map(t => (
                                <tr key={t.id} className="border-t border-[var(--border-color)]">
                                    <td className="py-2 text-[var(--text-secondary)] whitespace-nowrap pr-3">{t.date.split('-').reverse().join('/')}</td>
                                    <td className="py-2 font-bold text-[var(--text-primary)]">{cleanFuelDescription(t.description) || t.description}<span className="block text-[11px] font-medium text-[var(--text-secondary)]">{categoryMap[t.category_id || '']?.name || 'Sem categoria'}</span></td>
                                    <td className="py-2 text-right font-bold text-[var(--text-primary)] whitespace-nowrap">{formatCurrency(t.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {goals.length > 0 && (
                <div className={card}>
                    <h2 className="font-black text-[var(--text-primary)] uppercase tracking-wide text-sm mb-4">Metas</h2>
                    <div className="flex flex-col gap-3">
                        {goals.map(g => {
                            const pct = g.target_amount > 0 ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
                            return (
                                <div key={g.id} className="text-sm">
                                    <div className="flex justify-between font-bold text-[var(--text-primary)]">
                                        <span>{g.name}</span><span>{pct.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-2 my-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                        <div className="print-bar h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                    <p className="text-[11px] text-[var(--text-secondary)]">{formatCurrency(g.current_amount)} de {formatCurrency(g.target_amount)} · prazo {g.deadline.split('-').reverse().join('/')}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
