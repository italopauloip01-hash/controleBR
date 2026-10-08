import { useState } from 'react';
import { Wrench, Plus, CheckCircle2, Trash2, AlertTriangle, X } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useUserPrefs, newId, type MaintenanceItem } from '../utils/userPrefs';
import { MAINTENANCE_PRESETS, maintenanceStatus } from '../utils/maintenance';

interface VehicleMaintenanceProps {
    vehicleId: string;
    vehicleName: string;
    currentKm: number;
}

const LEVEL_STYLE = {
    ok: { bar: 'bg-emerald-500', text: 'text-emerald-500', label: 'Em dia' },
    soon: { bar: 'bg-amber-500', text: 'text-amber-500', label: 'Perto' },
    due: { bar: 'bg-rose-500', text: 'text-rose-500', label: 'Vencida' },
};

// Lembretes de manutenção por KM: avisa quando o odômetro (lido nas fotos ou digitado) chega perto
export default function VehicleMaintenance({ vehicleId, vehicleName, currentKm }: VehicleMaintenanceProps) {
    const { prefs, savePrefs } = useUserPrefs();
    const { showToast, confirmAction } = useNotification();
    const [isAdding, setIsAdding] = useState(false);
    const [name, setName] = useState('');
    const [intervalKm, setIntervalKm] = useState('');
    const [lastKm, setLastKm] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const all = prefs.maintenance || [];
    const items = all
        .filter(m => m.vehicleId === vehicleId)
        .map(m => maintenanceStatus(m, currentKm))
        .sort((a, b) => a.remainingKm - b.remainingKm);

    const save = async (next: MaintenanceItem[], message: string) => {
        setIsSaving(true);
        try {
            await savePrefs({ maintenance: next });
            showToast(message, 'success');
        } catch (error) {
            console.error('Error saving maintenance:', error);
            showToast('Não foi possível salvar a manutenção.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const interval = parseInt(intervalKm, 10);
        const last = lastKm ? parseInt(lastKm, 10) : currentKm;
        if (!name.trim() || !interval || interval <= 0) return showToast('Informe o nome e o intervalo em KM.', 'error');
        await save([...all, { id: newId(), vehicleId, name: name.trim(), intervalKm: interval, lastKm: last }], 'Lembrete de manutenção criado!');
        setName(''); setIntervalKm(''); setLastKm(''); setIsAdding(false);
    };

    const markDone = async (item: MaintenanceItem) => {
        const confirmed = await confirmAction({
            title: 'Manutenção feita',
            message: `Marcar "${item.name}" como feita agora, com ${currentKm.toLocaleString('pt-BR')} km?`,
            confirmText: 'Marcar feita',
            cancelText: 'Cancelar',
        });
        if (!confirmed) return;
        await save(all.map(m => (m.id === item.id ? { ...m, lastKm: currentKm } : m)), `${item.name}: próxima em ${(currentKm + item.intervalKm).toLocaleString('pt-BR')} km`);
    };

    const remove = async (item: MaintenanceItem) => {
        const confirmed = await confirmAction({
            title: 'Excluir lembrete',
            message: `Excluir o lembrete "${item.name}"?`,
            confirmText: 'Excluir',
            cancelText: 'Manter',
        });
        if (!confirmed) return;
        await save(all.filter(m => m.id !== item.id), 'Lembrete excluído.');
    };

    const inputClass = 'w-full px-4 py-3 border-2 border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm font-bold text-[var(--text-primary)] focus:border-[var(--color-carro)] outline-none';

    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[var(--color-meta-light)] text-[var(--color-meta)] rounded-lg">
                        <Wrench size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-[var(--text-primary)] uppercase tracking-wide text-sm">Manutenção por KM</h3>
                        <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                            {vehicleName} · odômetro atual {currentKm > 0 ? `${currentKm.toLocaleString('pt-BR')} km` : 'sem registro'}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setIsAdding(!isAdding)}
                    className="p-2.5 rounded-xl border-2 border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--color-carro)] transition-colors"
                    title="Novo lembrete"
                >
                    {isAdding ? <X size={18} /> : <Plus size={18} />}
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="mb-5 p-4 rounded-2xl bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] flex flex-col gap-3">
                    <div className="flex flex-wrap gap-1.5">
                        {MAINTENANCE_PRESETS.map(p => (
                            <button
                                key={p.name}
                                type="button"
                                onClick={() => { setName(p.name); setIntervalKm(String(p.intervalKm)); }}
                                className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--color-carro)]"
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>
                    <input className={inputClass} value={name} onChange={e => setName(e.target.value)} placeholder="Nome (ex: Troca de óleo)" />
                    <div className="grid grid-cols-2 gap-3">
                        <input className={inputClass} type="number" inputMode="numeric" min="1" value={intervalKm} onChange={e => setIntervalKm(e.target.value)} placeholder="A cada (km)" />
                        <input className={inputClass} type="number" inputMode="numeric" min="0" value={lastKm} onChange={e => setLastKm(e.target.value)} placeholder={`Feita em (km) ${currentKm ? `· ${currentKm}` : ''}`} />
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)]">Se não souber quando foi a última, deixe em branco: conta a partir do KM atual.</p>
                    <button type="submit" disabled={isSaving} className="py-3 rounded-xl bg-[var(--color-carro)] text-white font-black disabled:opacity-50">
                        {isSaving ? 'Salvando...' : 'Criar lembrete'}
                    </button>
                </form>
            )}

            {items.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)] text-center py-6">
                    Nenhum lembrete ainda. Toque em <strong>+</strong> para avisar a troca de óleo, pneus, correia...
                </p>
            ) : (
                <div className="flex flex-col gap-3">
                    {items.map(item => {
                        const style = LEVEL_STYLE[item.level];
                        return (
                            <div key={item.id} className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-1.5">
                                            {item.level !== 'ok' && <AlertTriangle size={14} className={style.text} />}
                                            {item.name}
                                        </p>
                                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                            A cada {item.intervalKm.toLocaleString('pt-BR')} km · próxima em {item.nextKm.toLocaleString('pt-BR')} km
                                        </p>
                                    </div>
                                    <span className={`text-[11px] font-black whitespace-nowrap ${style.text}`}>
                                        {item.remainingKm > 0 ? `faltam ${item.remainingKm.toLocaleString('pt-BR')} km` : `passou ${Math.abs(item.remainingKm).toLocaleString('pt-BR')} km`}
                                    </span>
                                </div>
                                <div className="h-2 mt-3 bg-[var(--bg-card)] rounded-full overflow-hidden">
                                    <div className={`h-full ${style.bar} rounded-full transition-all`} style={{ width: `${Math.min(100, Math.max(2, item.percent))}%` }} />
                                </div>
                                <div className="flex justify-end gap-2 mt-3">
                                    <button type="button" onClick={() => remove(item)} disabled={isSaving} className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-rose-500" title="Excluir">
                                        <Trash2 size={15} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => markDone(item)}
                                        disabled={isSaving || currentKm <= 0}
                                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 disabled:opacity-40"
                                    >
                                        <CheckCircle2 size={14} /> Feita agora
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
