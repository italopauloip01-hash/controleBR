import CreditCardForm from '../components/CreditCardForm';
import CreditCardList from '../components/CreditCardList';
import { useFinance } from '../context/FinanceContext';
import { CreditCard } from 'lucide-react';
import { formatCurrency } from '../utils/format';

export default function Cartoes() {
    const { creditCards } = useFinance();
    const totalLimit = creditCards.reduce((acc, card) => acc + card.limit, 0);

    return (
        <div className="space-y-8 animate-fade-in pb-24 lg:pb-8">
            {/* Header Moderno */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black text-[var(--text-primary)] flex items-center gap-3 tracking-tight">
                        <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/20">
                            <CreditCard className="text-white" size={28} />
                        </div>
                        Cartões de Crédito
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-2 font-medium">Controle de limites e gestão de faturas da sua frota de cartões.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Formulario */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Limite Total Card */}
                    <div className="relative overflow-hidden group bg-gradient-to-br from-violet-600 to-indigo-900 rounded-3xl p-6 shadow-md hover:shadow-lg transition-all border border-indigo-500/50">
                        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white rounded-full mix-blend-overlay opacity-10 blur-3xl"></div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3 border-b border-white/20 pb-3">
                                <CreditCard size={16} className="text-white/80" />
                                <span className="text-white/80 font-bold text-[10px] uppercase tracking-widest">Limite Global Aprovado</span>
                            </div>
                            <p className="text-4xl font-black text-white tracking-tighter drop-shadow-sm mt-3 truncate">
                                {formatCurrency(totalLimit)}
                            </p>
                        </div>
                    </div>

                    <div className="bg-[var(--bg-card)] p-6 border border-[var(--border-color)] rounded-3xl shadow-sm">
                        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide mb-4">Novo Cartão</h3>
                        <CreditCardForm />
                    </div>
                </div>

                {/* Lista */}
                <div className="lg:col-span-3">
                    <CreditCardList />
                </div>
            </div>
        </div>
    );
}
