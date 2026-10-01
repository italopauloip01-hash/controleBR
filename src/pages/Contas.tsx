import AccountForm from '../components/AccountForm';
import AccountList from '../components/AccountList';
import { useFinance } from '../context/FinanceContext';
import { Wallet, Landmark } from 'lucide-react';
import { formatCurrency } from '../utils/format';

export default function Contas() {
    const { accounts } = useFinance();
    const totalBalance = accounts.reduce((acc, account) => acc + account.balance, 0);

    return (
        <div className="space-y-8 animate-fade-in pb-24 lg:pb-8">
            {/* Header Moderno */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black text-[var(--text-primary)] flex items-center gap-3 tracking-tight">
                        <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-blue-700 rounded-xl shadow-lg shadow-indigo-500/20">
                            <Landmark className="text-white" size={28} />
                        </div>
                        Capital e Contas
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-2 font-medium">Suas carteiras, bancos corporativos e reservas ativas.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Formulario e Saldo Global */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Saldo Global Card Premium */}
                    <div className="relative overflow-hidden group bg-gradient-to-br from-[var(--color-conta)] to-blue-800 rounded-3xl p-6 shadow-md hover:shadow-lg transition-all border border-[var(--color-conta)]/50">
                        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white rounded-full mix-blend-overlay opacity-10 blur-3xl"></div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3 border-b border-white/20 pb-3">
                                <Wallet size={16} className="text-white/80" />
                                <span className="text-white/80 font-bold text-[10px] uppercase tracking-widest">Patrimônio Líquido Total</span>
                            </div>
                            <p className={`text-4xl font-black tracking-tighter drop-shadow-sm mt-3 truncate ${totalBalance >= 0 ? 'text-white' : 'text-rose-300'}`}>
                                {formatCurrency(totalBalance)}
                            </p>
                        </div>
                    </div>

                    <div className="bg-[var(--bg-card)] p-6 border border-[var(--border-color)] rounded-3xl shadow-sm">
                        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide mb-4">Adicionar Nova Conta</h3>
                        <AccountForm />
                    </div>
                </div>

                {/* Lista de Contas como Cartoes (Wallet Style) */}
                <div className="lg:col-span-3">
                    <AccountList />
                </div>
            </div>
        </div>
    );
}
