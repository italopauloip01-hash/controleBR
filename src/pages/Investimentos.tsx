import InvestmentForm from '../components/InvestmentForm';
import InvestmentList from '../components/InvestmentList';
import { useFinance } from '../context/FinanceContext';
import { TrendingUp, PieChart } from 'lucide-react';
import { formatCurrency } from '../utils/format';

export default function Investimentos() {
    const { investments } = useFinance();

    const totalInvestido = investments.reduce((acc, inv) => acc + inv.amount, 0);
    const totalRendimento = investments.reduce((acc, inv) => acc + inv.yield, 0);
    const patrimonioTotal = totalInvestido + totalRendimento;
    const rentabilidadeMedia = totalInvestido > 0 ? (totalRendimento / totalInvestido) * 100 : 0;

    return (
        <div className="space-y-8 animate-fade-in pb-24 lg:pb-8">
            {/* Header Moderno */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black text-[var(--text-primary)] flex items-center gap-3 tracking-tight">
                        <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/20">
                            <TrendingUp className="text-white" size={28} />
                        </div>
                        Ativos & Investimentos
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-2 font-medium">Controle de aplicações, corretoras e rendimentos dinâmicos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Formulario e Resumo */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Resumo Global Card */}
                    <div className="relative overflow-hidden group bg-gradient-to-br from-amber-500 to-amber-900 rounded-3xl p-6 shadow-md hover:shadow-lg transition-all border border-amber-500/50">
                        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white rounded-full mix-blend-overlay opacity-10 blur-3xl"></div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3 border-b border-white/20 pb-3">
                                <PieChart size={16} className="text-white/80" />
                                <span className="text-white/80 font-bold text-[10px] uppercase tracking-widest">Patrimônio Gerido</span>
                            </div>
                            
                            <p className="text-4xl font-black text-white tracking-tighter drop-shadow-sm mt-3 truncate">
                                {formatCurrency(patrimonioTotal)}
                            </p>

                            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/10">
                                <div>
                                    <p className="text-[9px] uppercase tracking-widest text-white/50 font-bold mb-1">Aportado</p>
                                    <p className="font-bold tracking-widest text-sm text-white/90">{formatCurrency(totalInvestido)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] uppercase tracking-widest text-white/50 font-bold mb-1">Lucro Global</p>
                                    <p className={`font-black text-sm drop-shadow-md ${totalRendimento >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {totalRendimento >= 0 ? '+' : ''}{formatCurrency(totalRendimento)} <span className="text-[10px]">({rentabilidadeMedia.toFixed(2)}%)</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[var(--bg-card)] p-6 border border-[var(--border-color)] rounded-3xl shadow-sm">
                        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide mb-4">Lançar Ativo</h3>
                        <InvestmentForm />
                    </div>
                </div>

                {/* Lista */}
                <div className="lg:col-span-3">
                    <InvestmentList />
                </div>
            </div>
        </div>
    );
}
