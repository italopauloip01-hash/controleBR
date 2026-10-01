import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, TrendingUp, TrendingDown, Car } from 'lucide-react';

export default function BottomNav() {
    return (
        <div className="md:hidden fixed bottom-0 left-0 w-full bg-[var(--bg-card)] border-t border-[var(--border-color)] z-40 pb-[env(safe-area-inset-bottom)]">
            <nav className="flex justify-around items-center h-16 px-2">
                <NavLink
                    to="/"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full gap-1 ${isActive ? 'text-[var(--color-conta)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`
                    }
                >
                    <LayoutDashboard size={18} />
                    <span className="text-[9px] font-medium">Início</span>
                </NavLink>

                <NavLink
                    to="/extrato"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full gap-0.5 ${isActive ? 'text-[var(--color-conta)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`
                    }
                >
                    <FileText size={18} />
                    <span className="text-[9px] font-medium">Extrato</span>
                </NavLink>

                <NavLink
                    to="/despesas"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full gap-0.5 ${isActive ? 'text-[var(--color-despesa)]' : 'text-[var(--text-secondary)] hover:text-[var(--color-despesa)]'
                        }`
                    }
                >
                    <div className="p-1.5 rounded-full cursor-pointer transition-colors bg-[var(--bg-secondary)] hover:bg-[var(--hover-bg)]">
                        <TrendingDown size={20} />
                    </div>
                    <span className="text-[9px] font-medium -mt-0.5">Saída</span>
                </NavLink>

                <NavLink
                    to="/receitas"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full gap-0.5 ${isActive ? 'text-[var(--color-receita)]' : 'text-[var(--text-secondary)] hover:text-[var(--color-receita)]'
                        }`
                    }
                >
                    <div className="p-1.5 rounded-full cursor-pointer transition-colors bg-[var(--bg-secondary)] hover:bg-[var(--hover-bg)]">
                        <TrendingUp size={20} />
                    </div>
                    <span className="text-[9px] font-medium -mt-0.5">Entrada</span>
                </NavLink>

                <NavLink
                    to="/veiculos"
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full gap-0.5 ${isActive ? 'text-[var(--color-conta)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`
                    }
                >
                    <Car size={18} />
                    <span className="text-[9px] font-medium">Veículo</span>
                </NavLink>
            </nav>
        </div>
    );
}
