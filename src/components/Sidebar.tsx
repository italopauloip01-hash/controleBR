import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import {
    LayoutDashboard,
    TrendingUp,
    TrendingDown,
    WalletCards,
    CreditCard,
    Target,
    PieChart,
    Settings,
    Award,
    Tags,
    Car,
    FileText,
    FileUp,
    FileBarChart
} from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { user } = useAuth();
    const { level, rankName, progressPercentage } = useGamification();

    const menuItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/receitas', icon: TrendingUp, label: 'Receitas' },
        { path: '/despesas', icon: TrendingDown, label: 'Despesas' },
        { path: '/extrato', icon: FileText, label: 'Extrato' },
        { path: '/importar', icon: FileUp, label: 'Importar Extrato' },
        { path: '/relatorio', icon: FileBarChart, label: 'Relatório Mensal' },
        { path: '/veiculos', icon: Car, label: 'Veículos' },
        { path: '/contas', icon: WalletCards, label: 'Contas' },
        { path: '/cartoes', icon: CreditCard, label: 'Cartões' },
        { path: '/categorias', icon: Tags, label: 'Categorias' },
        { path: '/metas', icon: Target, label: 'Metas' },
        { path: '/investimentos', icon: PieChart, label: 'Investimentos' },
    ];

    return (
        <aside className={`sidebar flex flex-col h-full bg-[var(--sidebar-bg)] backdrop-blur-xl border-r border-[var(--glass-border)] w-64 p-4 pt-[calc(1rem+env(safe-area-inset-top))] transition-all z-50 ${isOpen ? 'open' : ''}`}>
            <div className="flex flex-col gap-4 px-2 mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--color-xp)] flex items-center justify-center font-bold text-xl relative">
                        {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                        <div className="absolute -bottom-1 -right-1 bg-[var(--bg-card)] text-[var(--color-xp)] text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold border border-[var(--border-color)]">
                            {level}
                        </div>
                    </div>
                    <div>
                        <h1 className="font-bold text-base text-[var(--text-primary)] leading-tight truncate max-w-[130px]">
                            {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário'}
                        </h1>
                        <p className="text-xs text-[var(--text-secondary)] font-medium flex items-center gap-1">
                            <Award size={12} className="text-[var(--color-xp)]" /> {rankName}
                        </p>
                    </div>
                </div>

                {/* XP Progress Bar */}
                <div className="w-full">
                    <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mb-1">
                        <span>XP Progress</span>
                        <span>{Math.round(progressPercentage)}%</span>
                    </div>
                    <div className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full h-1 overflow-hidden">
                        <div
                            className="bg-[var(--color-xp)] h-1 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progressPercentage}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <nav className="flex-1 space-y-1">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all duration-300 ${isActive
                                ? 'bg-[var(--sidebar-active)] text-[var(--color-conta)] shadow-[inset_0_0_12px_rgba(59,130,246,0.1)] border border-[var(--color-conta-light)]'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] border border-transparent'
                            }`
                        }
                    >
                        <item.icon size={20} />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div className="mt-auto pt-4 border-t border-[var(--border)]">
                <NavLink
                    to="/config"
                    onClick={onClose}
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${isActive
                            ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] border border-transparent'
                        }`
                    }
                >
                    <Settings size={20} />
                    Configurações
                </NavLink>
            </div>
        </aside>
    );
}
