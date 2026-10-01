import { useMemo, useEffect, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useGamification } from '../context/GamificationContext';
import { useAuth } from '../context/AuthContext';
import { format, startOfMonth, endOfMonth, isWithinInterval, setMonth, setYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Wallet, TrendingUp, TrendingDown, Target, Zap, User, Sun, Moon, Sunrise, PieChart as PieChartIcon, Clock } from 'lucide-react';
import PeriodFilter from '../components/PeriodFilter';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency, parseDateLocal, todayLocalISO } from '../utils/format';
import { Link } from 'react-router-dom';

export default function Dashboard() {
    const { transactions, accounts, categoryMap, goals, investments, isLoading, selectedMonth, selectedYear, refreshData } = useFinance();
    const { level, rankName, progressPercentage, currentXP, xpForNextLevel } = useGamification();
    const { user } = useAuth();

    useEffect(() => {
        refreshData();
    }, []);

    const totalBalance = useMemo(() => accounts.reduce((acc, account) => acc + account.balance, 0), [accounts]);

    const { currentMonthEnd, currentMonthTransactions } = useMemo(() => {
        const date = setYear(setMonth(new Date(), selectedMonth), selectedYear);
        const start = startOfMonth(date);
        const end = endOfMonth(date);
        
        const currentTxs = transactions.filter(t => {
            const tDate = parseDateLocal(t.date);
            if (isNaN(tDate.getTime())) return false;
            return isWithinInterval(tDate, { start, end });
        });
        
        return { currentMonthEnd: end, currentMonthTransactions: currentTxs };
    }, [selectedMonth, selectedYear, transactions]);

    const { monthlyIncome, monthlyExpense } = useMemo(() => {
        let income = 0;
        let expense = 0;
        currentMonthTransactions.forEach(t => {
            if (t.type === 'revenue') income += t.amount;
            if (t.type === 'expense') expense += t.amount;
        });
        return { monthlyIncome: income, monthlyExpense: expense };
    }, [currentMonthTransactions]);

    const chartData = useMemo(() => {
        const expensesByCategory = currentMonthTransactions
            .filter(t => t.type === 'expense' && t.category_id)
            .reduce((acc, t) => {
                const category = categoryMap[t.category_id!];
                const catName = category ? category.name : 'Outros';
                acc[catName] = (acc[catName] || 0) + t.amount;
                return acc;
            }, {} as Record<string, number>);

        return Object.entries(expensesByCategory)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [currentMonthTransactions, categoryMap]);

    const { projectedBalance, pendingIncome, pendingExpense } = useMemo(() => {
        const todayStr = todayLocalISO();
        const transactionsUpToCurrentMonth = transactions.filter(t => parseDateLocal(t.date) <= currentMonthEnd);

        let pIncome = 0;
        let pExpense = 0;

        transactionsUpToCurrentMonth.forEach(t => {
            if (t.type === 'revenue' && (t.is_paid !== true || t.date > todayStr)) {
                pIncome += t.amount;
            } else if (t.type === 'expense' && (t.is_paid !== true || t.date > todayStr) && t.payment_method !== 'cartao_credito') {
                pExpense += t.amount;
            }
        });

        return { 
            pendingIncome: pIncome, 
            pendingExpense: pExpense, 
            projectedBalance: totalBalance + pIncome - pExpense 
        };
    }, [transactions, currentMonthEnd, totalBalance]);

    const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6'];

    const [activeIndex, setActiveIndex] = useState(-1);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return { text: "Bom dia", icon: <Sunrise size={20} className="text-amber-500" /> };
        if (hour >= 12 && hour < 18) return { text: "Boa tarde", icon: <Sun size={20} className="text-orange-500" /> };
        return { text: "Boa noite", icon: <Moon size={20} className="text-indigo-400" /> };
    };

    const greeting = getGreeting();
    
    // Pegar apenas o primeiro nome para o comprimento
    const firstName = useMemo(() => {
        const fullName = user?.user_metadata?.full_name || 'Usuário';
        return fullName.split(' ')[0];
    }, [user]);

    const onPieEnter = (_: any, index: number) => {
        setActiveIndex(index);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 h-screen">
                <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 rounded-xl border-4 border-[var(--bg-secondary)] border-t-[var(--color-conta)] animate-spin"></div>
                </div>
                <p className="mt-6 text-[var(--text-secondary)] font-bold tracking-widest uppercase text-xs">Carregando...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-700">
            {/* Header Section Premium */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <User size={28} className="text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {greeting.icon}
                            <span className="text-[var(--text-secondary)] text-sm font-bold uppercase tracking-widest">{greeting.text}, {firstName}</span>
                        </div>
                        <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight leading-tight">Painel de Controle</h1>
                    </div>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl py-1 px-1 shadow-sm">
                    <PeriodFilter />
                </div>
            </div>

            {/* Sumário Financeiro Estilizado (Invertido: Gasto Primeiro) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Despesa Total - Destaque Principal */}
                <div className="group relative overflow-hidden p-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="p-4 bg-rose-500/10 rounded-2xl text-rose-500 group-hover:scale-110 transition-transform duration-500">
                            <TrendingDown size={24} />
                        </div>
                        <span className="text-[10px] font-black text-rose-500/50 uppercase tracking-[0.2em] bg-rose-500/5 px-2.5 py-1 rounded-lg">Saídas do Mês</span>
                    </div>
                    <p className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest mb-1 relative z-10">Gasto no Mês</p>
                    <h2 className="text-4xl font-black text-[var(--text-primary)] tracking-tighter relative z-10">
                        {formatCurrency(monthlyExpense)}
                    </h2>
                </div>

                {/* Receita Total */}
                <div className="group relative overflow-hidden p-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-receita)]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="p-4 bg-[var(--color-receita)]/10 rounded-2xl text-[var(--color-receita)] group-hover:scale-110 transition-transform duration-500">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <p className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest mb-1 relative z-10">Total Mês</p>
                    <h2 className="text-4xl font-black text-[var(--color-receita)] tracking-tighter relative z-10">
                        {formatCurrency(monthlyIncome)}
                    </h2>
                </div>

                {/* Saldo Principal */}
                <div className="group relative overflow-hidden p-8 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-500 group-hover:scale-110 transition-transform duration-500">
                            <Wallet size={24} />
                        </div>
                        <span className="text-[10px] font-black text-indigo-500/50 uppercase tracking-[0.2em] bg-indigo-500/5 px-2.5 py-1 rounded-lg">Patrimônio</span>
                    </div>
                    <p className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest mb-1 relative z-10">Saldo Total</p>
                    <h2 className="text-4xl font-black text-[var(--text-primary)] tracking-tighter relative z-10">
                        {formatCurrency(totalBalance)}
                    </h2>
                </div>
            </div>

            {/* Projeção de Fluxo de Caixa */}
            <div className="rounded-[2rem] p-6 bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-[var(--color-meta-light)] text-[var(--color-meta)] rounded-lg">
                        <Target size={20} />
                    </div>
                    <h3 className="font-bold text-[var(--text-primary)] uppercase tracking-wide text-sm">Previsão Fim do Mês</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)]">
                        <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-1">Base Atual</p>
                        <p className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(totalBalance)}</p>
                    </div>
                    <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                        <p className="text-[10px] text-[var(--color-receita)] font-bold uppercase tracking-widest mb-1">A Receber</p>
                        <p className="text-lg font-bold text-[var(--color-receita)]">+{formatCurrency(pendingIncome)}</p>
                    </div>
                    <div className="p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10">
                        <p className="text-[10px] text-[var(--color-despesa)] font-bold uppercase tracking-widest mb-1">A Pagar</p>
                        <p className="text-lg font-bold text-[var(--color-despesa)]">-{formatCurrency(pendingExpense)}</p>
                    </div>
                    <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl border-l-4 border-l-indigo-500">
                        <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-1">Final Estimado</p>
                        <p className={`text-2xl font-black ${projectedBalance >= 0 ? 'text-[var(--text-primary)]' : 'text-rose-500'}`}>
                            {formatCurrency(projectedBalance)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom Section - Chart & History */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Despesas Chart */}
                <div className="xl:col-span-2 rounded-[2.5rem] p-8 bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm">
                    <h3 className="font-bold text-[var(--text-primary)] uppercase tracking-wide text-sm mb-8 flex items-center gap-2">
                        <PieChartIcon size={18} className="text-indigo-500"/> Divisão de Gastos
                    </h3>

                    <div className="relative group/chart">
                        {chartData.length > 0 ? (
                            <div className="h-[360px] md:h-[400px] w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPieChart>
                                        <Pie
                                            data={chartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius="55%"
                                            outerRadius="80%"
                                            paddingAngle={6}
                                            dataKey="value"
                                            stroke="none"
                                            cornerRadius={8}
                                            onMouseEnter={onPieEnter}
                                            onClick={onPieEnter}
                                            animationDuration={1000}
                                        >
                                            {chartData.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Legend 
                                            verticalAlign="bottom" 
                                            align="center"
                                            iconType="circle"
                                            wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }}
                                        />
                                    </RechartsPieChart>
                                </ResponsiveContainer>

                                <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center pointer-events-none px-6 w-3/4">
                                    {activeIndex !== -1 ? (
                                        <div className="animate-in fade-in zoom-in duration-300 w-full">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] truncate w-full">{chartData[activeIndex].name}</p>
                                            <p className="text-xl md:text-2xl font-black text-[var(--text-primary)] truncate w-full">{formatCurrency(chartData[activeIndex].value)}</p>
                                        </div>
                                    ) : (
                                        <div className="animate-in fade-in duration-500 w-full">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] truncate w-full">Total</p>
                                            <p className="text-xl md:text-2xl font-black text-[var(--text-primary)] truncate w-full">{formatCurrency(monthlyExpense)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-[320px] flex flex-col items-center justify-center text-[var(--text-secondary)] rounded-2xl bg-[var(--bg-secondary)]">
                                <PieChartIcon size={40} className="opacity-20 mb-4"/>
                                <p className="font-bold">Sem dados para exibir</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Radar Diário */}
                <div className="xl:col-span-1 rounded-[2.5rem] p-8 bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="font-bold text-[var(--text-primary)] uppercase tracking-wide text-sm flex items-center gap-2">
                            <Clock size={16} className="text-indigo-500"/> Radar Diário
                        </h3>
                        <Link to="/extrato" className="text-[10px] font-bold text-indigo-500 hover:opacity-70 uppercase tracking-widest">
                            Ver tudo
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {transactions.slice(0, 6).map((t) => {
                            const isRevenue = t.type === 'revenue';
                            const category = categoryMap[t.category_id!];
                            return (
                                <div key={t.id} className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] hover:border-indigo-500/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${isRevenue ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                            {isRevenue ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-[var(--text-primary)] truncate max-w-[120px]">{t.description}</p>
                                            <p className="text-[10px] text-[var(--text-secondary)] font-medium">{category?.name || 'Geral'}</p>
                                        </div>
                                    </div>
                                    <p className={`font-black text-sm ${isRevenue ? 'text-emerald-500' : 'text-[var(--text-primary)]'}`}>
                                        {isRevenue ? '+' : '-'}{formatCurrency(t.amount)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Gamification Banner */}
            <div className="relative overflow-hidden rounded-[2.5rem] p-8 bg-gradient-to-br from-indigo-900 to-purple-900 shadow-xl border border-white/10">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-amber-400">
                            <Zap size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white leading-tight">Nível {level} <span className="text-indigo-300 text-sm font-bold ml-2">{rankName}</span></h2>
                            <p className="text-indigo-200/60 text-sm mt-1 uppercase tracking-widest font-black">Meta de Progresso</p>
                        </div>
                    </div>
                    <div className="w-full max-w-md">
                        <div className="flex justify-between text-white text-xs font-bold mb-2">
                            <span>{currentXP} XP</span>
                            <span>{xpForNextLevel} XP</span>
                        </div>
                        <div className="h-2.5 bg-black/30 rounded-full overflow-hidden p-0.5 border border-white/5">
                            <div className="h-full bg-amber-400 rounded-full transition-all duration-1000" style={{ width: `${progressPercentage}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
