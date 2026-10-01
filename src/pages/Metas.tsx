import GoalForm from '../components/GoalForm';
import GoalList from '../components/GoalList';
import { useFinance } from '../context/FinanceContext';
import { Target, Trophy } from 'lucide-react';
import { formatCurrency } from '../utils/format';

export default function Metas() {
    const { goals } = useFinance();

    const totalTarget = goals.reduce((acc, goal) => acc + goal.target_amount, 0);
    const totalCurrent = goals.reduce((acc, goal) => acc + goal.current_amount, 0);
    const globalPercentage = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

    return (
        <div className="space-y-8 animate-fade-in pb-24 lg:pb-8">
            {/* Header Moderno */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black text-[var(--text-primary)] flex items-center gap-3 tracking-tight">
                        <div className="p-2.5 bg-gradient-to-br from-[var(--color-meta)] to-emerald-600 rounded-xl shadow-lg shadow-[var(--color-meta)]/20">
                            <Target className="text-white" size={28} />
                        </div>
                        Metas Financeiras
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-2 font-medium">Defina alvos, guarde recursos e rastreie seu progresso até o topo.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Formulario e Resumo */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Resumo Global Card */}
                    <div className="relative overflow-hidden group bg-gradient-to-br from-[var(--color-meta)] to-emerald-900 rounded-3xl p-6 shadow-md hover:shadow-lg transition-all border border-emerald-500/50">
                        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white rounded-full mix-blend-overlay opacity-10 blur-3xl"></div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3 border-b border-white/20 pb-3">
                                <Trophy size={16} className="text-white/80" />
                                <span className="text-white/80 font-bold text-[10px] uppercase tracking-widest">Progresso Global</span>
                            </div>
                            
                            <div className="mt-4 mb-2 flex items-end gap-2">
                                <p className="text-5xl font-black text-white tracking-tighter drop-shadow-sm truncate">
                                    {globalPercentage.toFixed(0)}%
                                </p>
                            </div>
                            
                            <div className="w-full bg-black/30 rounded-full h-1.5 overflow-hidden mb-5">
                                <div
                                    className="bg-white h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                                    style={{ width: `${Math.min(100, globalPercentage)}%` }}
                                ></div>
                            </div>

                            <div className="flex justify-between items-end border-t border-white/10 pt-3">
                                <div>
                                    <p className="text-[9px] uppercase tracking-widest text-white/50 font-bold mb-1">Guardado</p>
                                    <p className="font-bold tracking-widest text-sm text-white/90">{formatCurrency(totalCurrent)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] uppercase tracking-widest text-white/50 font-bold mb-1">Objetivo</p>
                                    <p className="font-bold tracking-widest text-sm text-white/90">{formatCurrency(totalTarget)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[var(--bg-card)] p-6 border border-[var(--border-color)] rounded-3xl shadow-sm">
                        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide mb-4">Nova Meta</h3>
                        <GoalForm />
                    </div>
                </div>

                {/* Lista */}
                <div className="lg:col-span-3">
                    <GoalList />
                </div>
            </div>
        </div>
    );
}
