import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, ChevronRight } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useUserPrefs } from '../utils/userPrefs';
import { currentKmByVehicle, maintenanceStatus } from '../utils/maintenance';

// Aviso no painel quando alguma manutenção está perto ou vencida
export default function MaintenanceAlerts() {
    const { transactions, vehicles } = useFinance();
    const { prefs } = useUserPrefs();

    const pending = useMemo(() => {
        const km = currentKmByVehicle(transactions);
        return (prefs.maintenance || [])
            .map(m => ({ ...maintenanceStatus(m, km[m.vehicleId] || 0), vehicle: vehicles.find(v => v.id === m.vehicleId)?.name }))
            .filter(m => m.vehicle && m.level !== 'ok')
            .sort((a, b) => a.remainingKm - b.remainingKm);
    }, [prefs.maintenance, transactions, vehicles]);

    if (pending.length === 0) return null;

    return (
        <Link
            to="/veiculos"
            className="flex items-center gap-4 rounded-[2rem] p-5 bg-amber-500/10 border-2 border-amber-500/30 hover:border-amber-500/60 transition-colors"
        >
            <div className="p-3 bg-amber-500/20 text-amber-500 rounded-2xl shrink-0">
                <Wrench size={22} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-black text-[var(--text-primary)] text-sm uppercase tracking-wide">Manutenção chegando</p>
                {pending.slice(0, 3).map(m => (
                    <p key={m.id} className="text-xs text-[var(--text-secondary)] font-medium truncate">
                        <strong className={m.level === 'due' ? 'text-rose-500' : 'text-amber-500'}>{m.name}</strong> · {m.vehicle} ·{' '}
                        {m.remainingKm > 0 ? `faltam ${m.remainingKm.toLocaleString('pt-BR')} km` : `vencida há ${Math.abs(m.remainingKm).toLocaleString('pt-BR')} km`}
                    </p>
                ))}
            </div>
            <ChevronRight size={20} className="text-amber-500 shrink-0" />
        </Link>
    );
}
