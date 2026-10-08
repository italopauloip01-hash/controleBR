import { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { startOfMonth, endOfMonth, format, parseISO, isWithinInterval } from 'date-fns';
import { FileText, TrendingUp, TrendingDown, Filter, Download, Calendar } from 'lucide-react';
import TransactionList from '../components/TransactionList';
import { todayLocalISO, parseDateLocal } from '../utils/format';

export default function Extrato() {
    const { transactions, categories, isLoading } = useFinance();

    // Filtros de Data. Default: mês atual
    const [startDate, setStartDate] = useState(format(startOfMonth(parseDateLocal(todayLocalISO())), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(parseDateLocal(todayLocalISO())), 'yyyy-MM-dd'));

    // Filtro de Tipo: 'all', 'revenue', 'expense'
    const [typeFilter, setTypeFilter] = useState<'all' | 'revenue' | 'expense'>('all');

    // Filtra transações por data e tipo
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            // Filtro de Tipo
            if (typeFilter !== 'all' && t.type !== typeFilter) {
                return false;
            }

            // Filtro de Data
            if (startDate && endDate) {
                const txDate = parseISO(t.date);
                const start = parseISO(startDate);
                const end = parseISO(endDate);
                
                // Ignora horários na comparação para pegar o dia inteiro
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);

                // Evita crash se a data for inválida
                if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && !isNaN(txDate.getTime())) {
                    if (!isWithinInterval(txDate, { start, end })) {
                        return false;
                    }
                }
            }

            return true;
        });
    }, [transactions, startDate, endDate, typeFilter]);

    // Calcula os totais baseados apenas nas transações filtradas
    const totals = useMemo(() => {
        return filteredTransactions.reduce(
            (acc, curr) => {
                if (curr.type === 'revenue') {
                    acc.incomes += curr.amount;
                } else if (curr.type === 'expense') {
                    acc.expenses += curr.amount;
                }
                return acc;
            },
            { incomes: 0, expenses: 0 }
        );
    }, [filteredTransactions]);

    const balance = totals.incomes - totals.expenses;

    const handleExportCSV = () => {
        if (filteredTransactions.length === 0) {
            alert("Sem dados para o período selecionado.");
            return;
        }

        const headers = ['Data', 'Descricao', 'Categoria', 'Valor', 'Tipo', 'Situacao', 'Meio de Pagamento'];
        const rows = filteredTransactions.map(t => {
            const categoryName = categories.find(c => c.id === t.category_id)?.name || 'Outros';
            return [
                t.date,
                `"${(t.description || '').replace(/"/g, '""')}"`,
                `"${categoryName}"`,
                t.amount.toString(),
                t.type === 'revenue' ? 'Receita' : 'Despesa',
                t.is_paid ? 'Pago/Recebido' : 'Pendente',
                t.payment_method || '-'
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `extrato_financeiro_${todayLocalISO()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 h-full">
                <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 rounded-xl border-4 border-[var(--bg-secondary)] border-t-blue-500 animate-spin shadow-lg"></div>
                    <div className="absolute inset-2 rounded-lg bg-blue-500/20 mix-blend-screen animate-pulse"></div>
                </div>
                <p className="mt-6 text-[var(--text-secondary)] font-bold tracking-widest uppercase text-xs">Analisando registros...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-24 lg:pb-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black text-[var(--text-primary)] flex items-center gap-3 tracking-tight">
                        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
                            <FileText className="text-white" size={28} />
                        </div>
                        Extrato da Conta
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-2 font-medium">Relatório cirúrgico com todo o histórico financeiro.</p>
                </div>
                <button
                    onClick={handleExportCSV}
                    className="bg-white text-gray-900 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all font-bold text-sm shadow-sm hover:shadow-md h-fit active:scale-95"
                >
                    <Download size={18} className="text-blue-600" />
                    Baixar Excel
                </button>
            </header>

            {/* Painel de Filtros Inteligente */}
            <div className="rounded-3xl p-6 bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b border-[var(--border-color)] pb-3">
                    <div className="p-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-lg">
                        <Filter size={18} />
                    </div>
                    <h3 className="font-bold text-[var(--text-primary)] uppercase tracking-wide text-sm">Laboratório de Busca</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="relative group">
                        <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest px-1">
                            Início
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] pointer-events-none group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm appearance-none"
                            />
                        </div>
                    </div>
                    
                    <div className="relative group">
                        <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest px-1">
                            Fim
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] pointer-events-none group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm appearance-none"
                            />
                        </div>
                    </div>

                    <div className="relative group">
                        <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest px-1">
                            Fluxo
                        </label>
                        <div className="relative">
                            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] pointer-events-none group-focus-within:text-blue-500 transition-colors" size={18} />
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value as any)}
                                className="w-full pl-12 pr-10 py-3 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none transition-all shadow-sm cursor-pointer"
                            >
                                <option value="all">Filtro Misto (Todos)</option>
                                <option value="revenue">Somente Lucros</option>
                                <option value="expense">Somente Gasto</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-[var(--text-muted)]">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Resumo Financeiro do Período (Cards Premium) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="rounded-3xl p-6 bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all hover:scale-[1.02] flex items-center justify-between relative overflow-hidden">
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-[var(--color-receita)] rounded-full mix-blend-multiply opacity-5 blur-2xl"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Entradas Geradas</p>
                        <p className="text-3xl font-black text-[var(--color-receita)] tracking-tight truncate">
                            +{totals.incomes.toFixed(2).replace('.', ',')}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--color-receita)] to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 relative z-10">
                        <TrendingUp size={24} />
                    </div>
                </div>

                <div className="rounded-3xl p-6 bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all hover:scale-[1.02] flex items-center justify-between relative overflow-hidden">
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-[var(--color-despesa)] rounded-full mix-blend-multiply opacity-5 blur-2xl"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Capital Gasto</p>
                        <p className="text-3xl font-black text-[var(--text-primary)] tracking-tight truncate">
                            R$ {totals.expenses.toFixed(2).replace('.', ',')}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--color-despesa)] to-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20 relative z-10">
                        <TrendingDown size={24} />
                    </div>
                </div>

                <div className={`rounded-3xl p-6 bg-gradient-to-br ${balance >= 0 ? 'from-[#0f172a] to-blue-900 border-blue-500/30' : 'from-[#0f172a] to-rose-900 border-rose-500/30'} border shadow-md hover:shadow-lg transition-all hover:scale-[1.02] flex items-center justify-between relative overflow-hidden group`}>
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white rounded-full mix-blend-overlay opacity-5 blur-2xl group-hover:opacity-10 transition-opacity"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                             Resultado Exato
                        </p>
                        <p className={`text-4xl font-black tracking-tighter truncate ${balance >= 0 ? 'text-blue-300 drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'text-rose-300 drop-shadow-[0_0_10px_rgba(225,29,72,0.3)]'}`}>
                            {balance >= 0 ? '+' : ''}{balance.toFixed(2).replace('.', ',')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Lista de Transações */}
            <div className="pt-2">
                <div className="flex items-center justify-between mb-6 px-1">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2 tracking-tight">
                        Livro Caixa 
                        <span className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)] text-xs px-3 py-1 rounded-full shadow-sm">
                            {filteredTransactions.length} registros
                        </span>
                    </h2>
                </div>
                <TransactionList transactions={filteredTransactions} />
            </div>
        </div>
    );
}
