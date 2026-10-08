import { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { supabase } from '../utils/supabase';
import { useNotification } from '../context/NotificationContext';
import PeriodFilter from '../components/PeriodFilter';
import { Car, Fuel, Wrench, AlertCircle, PlusCircle, Edit2, Trash2, Calendar, MapPin, TrendingUp, Activity, Route, Calculator, RotateCcw, ShieldCheck, Zap, Sparkles, CheckCircle2, X } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { isCarRelated, isFuelRelated } from '../utils/categoriesMap';
import VehicleForm from '../components/VehicleForm';
import ExpenseForm, { type FuelPrefill } from '../components/ExpenseForm';
import FuelPhotoButton from '../components/FuelPhotoButton';
import { calculateFuelMetrics, type FuelStats, FUEL_TYPES, detectFuelType, cleanFuelDescription, type FuelType } from '../utils/fuelUtils';

// Abastecimento = descrição (sem tags automáticas) fala de combustível OU há litros registrados.
// Assim, manutenção antiga marcada por engano com [Gasolina] não é tratada como combustível.
const isFuelTx = (t: { description?: string | null; liters?: number | null }, categoryName: string = ''): boolean =>
    isFuelRelated(cleanFuelDescription(t.description || ''), categoryName) || (t.liters || 0) > 0;

export default function Veiculos() {
    const { transactions, categories, vehicles, refreshData, selectedMonth, selectedYear } = useFinance();
    const { confirmAction } = useNotification();
    const [selectedVehicleId, setSelectedVehicleId] = useState('all');
    const [isAddingVehicle, setIsAddingVehicle] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<any | null>(null);
    const [photoPrefill, setPhotoPrefill] = useState<FuelPrefill | null>(null);

    // States for Simulator
    const [simDistancia, setSimDistancia] = useState<number | ''>('');
    const [simPrecoCombustivel, setSimPrecoCombustivel] = useState<number>(5.80);
    const [simPedagios, setSimPedagios] = useState<number | ''>('');
    const [simCombustivelTipo, setSimCombustivelTipo] = useState<'geral' | 'gasolina' | 'etanol'>('geral');

    const currentPeriod = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

    const handleDeleteVehicle = async () => {
        if (selectedVehicleId === 'all') return;
        
        const vehicle = vehicles.find(v => v.id === selectedVehicleId);
        if (!vehicle) return;

        const confirmed = await confirmAction({
            title: 'Excluir Veículo',
            message: `Tem certeza que deseja excluir o veículo "${vehicle.name}"? Esta ação não removerá os gastos já registrados.`,
            confirmText: 'Excluir',
            cancelText: 'Manter'
        });

        if (!confirmed) return;

        try {
            const { error } = await supabase.from('vehicles').delete().eq('id', selectedVehicleId);
            if (error) throw error;
            
            setSelectedVehicleId('all');
            await refreshData();
        } catch (error) {
            console.error('Error deleting vehicle:', error);
            alert('Erro ao excluir veículo.');
        }
    };

    // Extract car-related transactions (ALL TIME - Para métricas globais)
    const globalCarTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (t.type !== 'expense') return false;

            if (selectedVehicleId !== 'all') {
                return t.vehicle_id === selectedVehicleId;
            }

            const catObj = categories.find(c => c.id === t.category_id);
            const cat = catObj ? catObj.name : '';
            const desc = t.description || '';
            return isCarRelated(desc, cat);
        });
    }, [transactions, categories, selectedVehicleId]);

    // Filter by period (ONLY THIS MONTH - Para gastos do mês)
    const monthlyCarTransactions = useMemo(() => {
        return globalCarTransactions.filter(t => t.date.startsWith(currentPeriod));
    }, [globalCarTransactions, currentPeriod]);

    // -------------------------------------------------------------
    // HELPERS FOR FUEL CALCULATIONS
    // -------------------------------------------------------------
    const fuelTransactionsSorted = useMemo(() => {
        return globalCarTransactions
            .filter(t => {
                const cat = categories.find(c => c.id === t.category_id)?.name || '';
                return isFuelTx(t, cat) && (t.mileage || 0) > 0;
            })
            .sort((a, b) => (a.mileage || 0) - (b.mileage || 0)); // Ascending by mileage
    }, [globalCarTransactions, categories]);

    // Métricas avançadas de combustível (com distinção flex e detecção de gaps/saltos de odômetro)
    const fuelStats = useMemo(() => {
        return calculateFuelMetrics(fuelTransactionsSorted);
    }, [fuelTransactionsSorted]);

    // Mapeamento rápido de cálculos por transação
    const segmentMap = useMemo(() => {
        const map = new Map<string, any>();
        fuelStats.segments.forEach(s => map.set(s.transactionId, s));
        return map;
    }, [fuelStats]);

    // Métricas Globais Históricas
    const globalMetrics = useMemo(() => {
        return {
            kmRodados: fuelStats.totalKmRodados,
            kmPorLitro: fuelStats.mediaGeralKmPorLitro,
            custoPorKm: fuelStats.custoMedioPorKm
        };
    }, [fuelStats]);

    // Métricas do Mês selecionado
    const monthlyMetrics = useMemo(() => {
        let totalCombustivel = 0;
        let totalOutros = 0;

        monthlyCarTransactions.forEach(t => {
            const catObj = categories.find(c => c.id === t.category_id);
            const cat = catObj ? catObj.name : '';
            if (isFuelTx(t, cat)) {
                totalCombustivel += t.amount;
            } else {
                totalOutros += t.amount;
            }
        });

        let monthValidDistance = 0;
        let monthValidLiters = 0;

        fuelStats.segments.forEach(s => {
            if (s.date.startsWith(currentPeriod) && !s.isGapOutlier && s.dist > 0 && s.liters > 0) {
                monthValidDistance += s.dist;
                monthValidLiters += s.liters;
            }
        });

        const kmPorLitro = (monthValidDistance > 0 && monthValidLiters > 0) ? (monthValidDistance / monthValidLiters) : 0;

        return { totalCombustivel, totalOutros, totalGeral: totalCombustivel + totalOutros, kmPorLitro };
    }, [monthlyCarTransactions, categories, fuelStats, currentPeriod]);

    const lastRefuelingAvg = fuelStats.ultimoAbastecimento ? fuelStats.ultimoAbastecimento.kmPorLitro : 0;


    const activeVehicleName = selectedVehicleId === 'all' 
        ? 'Todos os Veículos' 
        : vehicles.find(v => v.id === selectedVehicleId)?.name || 'Veículo';

    return (
        <div className="space-y-6 pb-24 lg:pb-6 animate-fade-in">
            {/* Header / Config area */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-6">
                <div className="flex-1 w-full">
                    <h1 className="text-3xl font-black text-[var(--text-primary)] flex items-center gap-3 tracking-tight">
                        <div className="p-2.5 bg-gradient-to-br from-[var(--color-carro)] to-blue-600 rounded-xl shadow-lg mt-1">
                            <Car className="text-white" size={28} />
                        </div>
                        Gestão de Frota
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-2 font-medium">Controle as médias globais e os gastos mensais do seu {activeVehicleName}.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto">
                    <div className="flex items-center gap-2 flex-1 sm:flex-none">
                        <div className="relative flex-1 sm:w-64">
                            <select
                                value={selectedVehicleId}
                                onChange={(e) => setSelectedVehicleId(e.target.value)}
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] font-semibold rounded-xl focus:ring-2 focus:ring-[var(--color-carro)] focus:border-transparent block p-3 outline-none appearance-none cursor-pointer transition-all shadow-sm"
                            >
                                <option value="all"> Frota Geral</option>
                                {vehicles.map(v => (
                                    <option key={v.id} value={v.id}>{v.name} ({v.plate})</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-[var(--text-secondary)] opacity-70">
                                <Car size={18} />
                            </div>
                        </div>

                        {selectedVehicleId !== 'all' && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setEditingVehicle(vehicles.find(v => v.id === selectedVehicleId))}
                                    className="p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--color-carro)] hover:border-[var(--color-carro)] rounded-xl transition-all shadow-sm"
                                    title="Editar Veículo"
                                >
                                    <Edit2 size={20} />
                                </button>
                                <button
                                    onClick={handleDeleteVehicle}
                                    className="p-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-red-500 hover:border-red-500 rounded-xl transition-all shadow-sm"
                                    title="Excluir Veículo"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        )}

                        <FuelPhotoButton
                            onResult={(reading) => setPhotoPrefill({ reading, vehicleId: selectedVehicleId })}
                            vehicleId={selectedVehicleId}
                            label="Foto"
                            className="p-3 bg-[var(--color-carro)] text-white rounded-xl shadow-sm hover:opacity-90 [&>span]:hidden sm:[&>span]:block"
                        />

                        <button
                            onClick={() => setIsAddingVehicle(!isAddingVehicle)}
                            className={`p-3 bg-[var(--bg-secondary)] rounded-xl flex items-center justify-center transition-all shadow-sm font-medium gap-2 ${isAddingVehicle ? 'border border-[var(--color-carro)] text-[var(--color-carro)]' : 'border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--color-carro)]'}`}
                            title="Adicionar Veículo"
                        >
                            <PlusCircle size={20} /> <span className="hidden sm:block">Novo</span>
                        </button>
                    </div>
                </div>
            </div>

            {isAddingVehicle && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <VehicleForm onClose={() => setIsAddingVehicle(false)} />
                </div>
            )}

            {photoPrefill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]" onMouseDown={() => setPhotoPrefill(null)}>
                    <div
                        className="bg-[var(--bg-color)] rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col relative border border-[var(--border)]"
                        onMouseDown={e => e.stopPropagation()}
                    >
                        <div className="flex justify-end p-2 pb-0 shrink-0">
                            <button
                                onClick={() => setPhotoPrefill(null)}
                                className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-heading)] hover:bg-[var(--bg-secondary)] rounded-full transition-colors z-10"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-1 pb-4">
                            <ExpenseForm fuelPrefill={photoPrefill} onSuccess={() => setPhotoPrefill(null)} />
                        </div>
                    </div>
                </div>
            )}

            {editingVehicle && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <VehicleForm 
                        vehicle={editingVehicle} 
                        onClose={() => setEditingVehicle(null)} 
                    />
                </div>
            )}

            {/* HERO GLOBAL METRICS - Doesn't change dynamically with the month */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-1 border border-[var(--border-color)] rounded-3xl p-6 relative overflow-hidden group bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-secondary)] shadow-sm hover:shadow-md transition-shadow">
                    {/* Background decor */}
                    <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-[var(--color-xp)] rounded-full mix-blend-multiply opacity-5 group-hover:opacity-10 transition-opacity blur-3xl"></div>
                    
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-6 border-b border-[var(--border-color)] pb-3">
                            <div className="p-2 bg-[var(--color-xp-light)] text-[var(--color-xp)] rounded-lg">
                                <Activity size={20} />
                            </div>
                            <h3 className="font-bold text-[var(--text-primary)] uppercase tracking-wide text-sm">Eficiência Histórica</h3>
                        </div>
                        
                        <div className="flex flex-col gap-1 mb-4">
                            <span className="text-[var(--text-secondary)] font-medium text-xs uppercase tracking-wider">Média Global <span className="opacity-50 lowercase text-[9px]">/ vida útil</span></span>
                            <div className="flex items-end gap-2 mt-1">
                                <span className="text-4xl font-black text-[var(--text-primary)] tracking-tighter" style={{ textShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                                    {globalMetrics.kmPorLitro > 0 ? globalMetrics.kmPorLitro.toFixed(1) : '--'}
                                </span>
                                <span className="text-sm text-[var(--color-xp)] font-bold mb-1 tracking-tight">KM/L</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="bg-[var(--bg-card)] p-3 rounded-2xl border border-[var(--border-color)]">
                                <p className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-widest mb-1 text-emerald-500">Média Geral do Mês</p>
                                <p className="font-bold text-[var(--text-primary)] text-xl tracking-tight">
                                    {monthlyMetrics.kmPorLitro > 0 ? monthlyMetrics.kmPorLitro.toFixed(1) : '--'} <span className="text-[10px] text-[var(--text-muted)]">km/l</span>
                                </p>
                            </div>
                            <div className="bg-[var(--bg-card)] p-3 rounded-2xl border border-[var(--border-color)]">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-widest text-indigo-400">Último Abastecimento</p>
                                    {fuelStats.ultimoAbastecimento && (
                                        <span className="text-[9px] font-bold">
                                            {FUEL_TYPES[fuelStats.ultimoAbastecimento.fuelType]?.icon} {FUEL_TYPES[fuelStats.ultimoAbastecimento.fuelType]?.shortLabel}
                                        </span>
                                    )}
                                </div>
                                <p className="font-bold text-[var(--text-primary)] text-xl tracking-tight">
                                    {fuelStats.ultimoAbastecimento?.isResetOrGap ? (
                                        <span className="text-amber-500 text-sm font-black flex items-center gap-1">
                                            <RotateCcw size={12} /> Novo Ciclo
                                        </span>
                                    ) : lastRefuelingAvg > 0 ? (
                                        <>
                                            {lastRefuelingAvg.toFixed(1)} <span className="text-[10px] text-[var(--text-muted)]">km/l</span>
                                        </>
                                    ) : (
                                        '--'
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-[var(--border-color)] flex justify-between items-center text-xs">
                           <div className="flex flex-col">
                               <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest mb-0.5">Km Percorrida</p>
                               <p className="font-bold text-[var(--text-primary)]">{globalMetrics.kmRodados.toLocaleString('pt-BR')} KM</p>
                           </div>
                           <div className="flex flex-col items-end">
                               <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest mb-0.5">Custo Médio</p>
                               <p className="font-bold text-[var(--text-primary)]">
                                   {globalMetrics.kmRodados > 0 ? `${formatCurrency(globalMetrics.custoPorKm)} /km` : '---'}
                               </p>
                           </div>
                        </div>
                    </div>
                </div>

                {/* MONTHLY FINANCIAL METRICS */}
                <div className="lg:col-span-2 border border-[var(--border-color)] rounded-3xl p-6 bg-[var(--bg-card)] shadow-sm flex flex-col">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-[var(--border-color)] pb-3 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[var(--color-despesa-light)] text-[var(--color-despesa)] rounded-lg">
                                <TrendingUp size={20} />
                            </div>
                            <h3 className="font-bold text-[var(--text-primary)] uppercase tracking-wide text-sm">Custos Atuais no Mês</h3>
                        </div>
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-0.5 px-0.5">
                           <PeriodFilter />
                        </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex flex-col justify-center relative p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] transition-transform hover:scale-[1.02]">
                            <div className="absolute top-4 right-4 opacity-10"><Car size={32} /></div>
                            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">Total no Mês</p>
                            <p className="text-3xl font-black text-[var(--text-primary)] truncate">{formatCurrency(monthlyMetrics.totalGeral)}</p>
                        </div>

                        <div className="flex flex-col justify-center relative p-5 rounded-2xl bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--color-despesa-light)] border border-[var(--color-despesa)]/20 transition-transform hover:scale-[1.02]">
                            <div className="absolute top-4 right-4 text-[var(--color-despesa)] opacity-20"><Fuel size={32} /></div>
                            <p className="text-[10px] font-bold text-[var(--color-despesa)] uppercase tracking-widest mb-2">Com Combustível</p>
                            <p className="text-3xl font-black text-[var(--text-primary)] truncate">{formatCurrency(monthlyMetrics.totalCombustivel)}</p>
                        </div>

                        <div className="flex flex-col justify-center relative p-5 rounded-2xl bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--color-meta-light)] border border-[var(--color-meta)]/20 transition-transform hover:scale-[1.02]">
                            <div className="absolute top-4 right-4 text-[var(--color-meta)] opacity-20"><Wrench size={32} /></div>
                            <p className="text-[10px] font-bold text-[var(--color-meta)] uppercase tracking-widest mb-2">Com Manutenção</p>
                            <p className="text-3xl font-black text-[var(--text-primary)] truncate">{formatCurrency(monthlyMetrics.totalOutros)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* PAINEL MULTICOMBUSTÍVEL & PARIDADE FLEX */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Média Gasolina */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:border-amber-500/40 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">⛽</span>
                            <span className="text-xs font-black uppercase tracking-wider text-amber-500">Média Gasolina</span>
                        </div>
                        <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                            {fuelStats.gasolina.abastecimentosCount} abastec.
                        </span>
                    </div>

                    <div className="my-2">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-black text-[var(--text-primary)]">
                                {fuelStats.gasolina.kmPorLitro > 0 ? fuelStats.gasolina.kmPorLitro.toFixed(1) : '--'}
                            </span>
                            <span className="text-xs font-bold text-amber-500">KM/L</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] font-medium mt-1">
                            {fuelStats.gasolina.custoPorKm > 0 ? `${formatCurrency(fuelStats.gasolina.custoPorKm)} /km` : 'Custo /km indisponível'}
                        </p>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-color)] text-[10px] text-[var(--text-muted)] flex justify-between font-medium">
                        <span>Litros: {fuelStats.gasolina.totalLitros.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L</span>
                        <span>Rodados: {fuelStats.gasolina.totalKm.toLocaleString('pt-BR')} KM</span>
                    </div>
                </div>

                {/* Média Etanol */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:border-emerald-500/40 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🌿</span>
                            <span className="text-xs font-black uppercase tracking-wider text-emerald-500">Média Etanol</span>
                        </div>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                            {fuelStats.etanol.abastecimentosCount} abastec.
                        </span>
                    </div>

                    <div className="my-2">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-black text-[var(--text-primary)]">
                                {fuelStats.etanol.kmPorLitro > 0 ? fuelStats.etanol.kmPorLitro.toFixed(1) : '--'}
                            </span>
                            <span className="text-xs font-bold text-emerald-500">KM/L</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] font-medium mt-1">
                            {fuelStats.etanol.custoPorKm > 0 ? `${formatCurrency(fuelStats.etanol.custoPorKm)} /km` : 'Custo /km indisponível'}
                        </p>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-color)] text-[10px] text-[var(--text-muted)] flex justify-between font-medium">
                        <span>Litros: {fuelStats.etanol.totalLitros.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L</span>
                        <span>Rodados: {fuelStats.etanol.totalKm.toLocaleString('pt-BR')} KM</span>
                    </div>
                </div>

                {/* Paridade Real Flex */}
                <div className="bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Zap size={16} className="text-indigo-400" />
                                <span className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">Paridade Flex Real</span>
                            </div>
                            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
                                {fuelStats.paridadeFlex.isCalculated ? `${fuelStats.paridadeFlex.ratioPercent.toFixed(0)}% Eficiência` : 'Flex Inteligente'}
                            </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-2">
                            {fuelStats.paridadeFlex.recomendacao}
                        </p>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-color)] mt-3 text-[10px] text-[var(--text-muted)] font-semibold flex items-center gap-1">
                        <Sparkles size={12} className="text-amber-400" />
                        <span>Calculado com base no motor real</span>
                    </div>
                </div>

                {/* Proteção Anti-Distorção de Odômetro */}
                <div className="bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={16} className="text-emerald-500" />
                                <span className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">Proteção de Odômetro</span>
                            </div>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                                Ativa
                            </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-2">
                            Saltos acima de 900 km (esquecimento de registros) e a tag <strong>[NOVO_CICLO]</strong> reiniciam a contagem automaticamente, blindando suas médias contra valores irreais.
                        </p>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-color)] mt-3 text-[10px] text-[var(--text-muted)] font-semibold flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        <span>Gaps e intervalos não distorcem sua média</span>
                    </div>
                </div>
            </div>

            {/* Informative Note */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-2.5 bg-[var(--bg-card)] rounded-xl shrink-0 shadow-sm border border-[var(--border-color)]">
                    <AlertCircle className="text-[var(--color-carro)]" size={20} />
                </div>
                <div className="flex-1 pt-0.5">
                    <h3 className="text-[var(--text-primary)] font-bold mb-1.5 text-sm uppercase tracking-wide">Inteligência Estratégica</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">Sua Média KM/L histórica <strong className="text-[var(--text-primary)] font-bold">não é apagada ou reiniciada</strong> pelo filtro da tela. O card principal abraça todos os dados lançados desde que você adquiriu o veículo. Dica de ouro para manter a conta exata: insira sempre o número correto e real de <strong className="text-[var(--text-primary)] font-bold">Hodômetro/KM</strong> e <strong className="text-[var(--text-primary)] font-bold">Litros</strong> no ato de registrar os Recibos do Posto.</p>
                </div>
            </div>

            {/* List of Transactions */}
            <div className="bg-transparent mt-8">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Lançamentos do Mês</h2>
                    <span className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)] text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                        {monthlyCarTransactions.length} registros
                    </span>
                </div>

                {monthlyCarTransactions.length === 0 ? (
                    <div className="py-20 px-4 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2rem] flex flex-col items-center justify-center shadow-sm relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--bg-secondary)]/50 pointer-events-none"></div>
                        <div className="w-24 h-24 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mb-6 border border-[var(--border-color)] shadow-inner">
                            <Car className="text-[var(--text-muted)] opacity-50 outline-2" size={40} />
                        </div>
                        <p className="text-[var(--text-primary)] font-black text-2xl tracking-tight mb-2">Nenhum gasto esse mês!</p>
                        <p className="text-[var(--text-secondary)] text-sm max-w-sm mx-auto">Sua carteira respira aliviada. Não há despensas ou abastecimentos em {currentPeriod.split('-').reverse().join('/')}.</p>
                    </div>
                ) : (
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-sm">
                        {/* Desktop View Table */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-[var(--bg-secondary)]/50 border-b border-[var(--border-color)]">
                                        <th className="p-5 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Data</th>
                                        <th className="p-5 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Descrição</th>
                                        <th className="p-5 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Detalhes Técnicos</th>
                                        <th className="p-5 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)] text-right">Valor Custo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyCarTransactions.map((t, index) => {
                                        const catName = categories.find(c => c.id === t.category_id)?.name || '';
                                        const isFuel = isFuelTx(t, catName);
                                        const seg = segmentMap.get(t.id);
                                        const fuelType = seg ? seg.fuelType : detectFuelType(t.description);
                                        const fuelInfo = FUEL_TYPES[fuelType] || FUEL_TYPES.gasolina;
                                        const displayTitle = cleanFuelDescription(t.description) || (isFuel ? 'Abastecimento' : t.description);

                                        return (
                                            <tr key={t.id} className={`border-b border-[var(--border-color)] hover:bg-[var(--hover-bg)] transition-colors ${index === monthlyCarTransactions.length - 1 ? 'border-none' : ''}`}>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold text-sm">
                                                        <Calendar size={14} className="text-[var(--color-carro)]" />
                                                        {t.date.split('-').reverse().join('/')}
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-3 rounded-2xl shadow-sm border ${isFuel ? 'bg-gradient-to-tl from-[var(--color-despesa)] to-rose-400 text-white border-rose-500/20' : 'bg-gradient-to-br from-[var(--color-meta)] to-emerald-400 text-white border-emerald-500/20'}`}>
                                                            {isFuel ? <Fuel size={16} /> : <Wrench size={16} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-[var(--text-primary)] font-bold text-[15px]">{displayTitle}</p>
                                                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-semibold uppercase tracking-wider">
                                                                    {catName || '-'}
                                                                </span>
                                                                {isFuel && (
                                                                    <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold ${fuelInfo.badgeBg} ${fuelInfo.badgeText} ${fuelInfo.badgeBorder}`}>
                                                                        {fuelInfo.icon} {fuelInfo.label}
                                                                    </span>
                                                                )}
                                                                {seg?.isGapOutlier && (
                                                                    <span 
                                                                        className="text-[10px] px-2 py-0.5 rounded-lg border font-bold bg-amber-500/10 text-amber-500 border-amber-500/20 flex items-center gap-1"
                                                                        title={seg.gapReason || 'Novo ciclo iniciado para não distorcer médias'}
                                                                    >
                                                                        <RotateCcw size={10} /> Novo Ciclo
                                                                    </span>
                                                                )}
                                                                {seg && !seg.isGapOutlier && seg.kmPerLiter > 0 && (
                                                                    <span className="text-[10px] px-2 py-0.5 rounded-lg border font-bold bg-indigo-500/10 text-indigo-400 border-indigo-500/20 flex items-center gap-1">
                                                                        <Activity size={10} /> {seg.kmPerLiter.toFixed(1)} km/l
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex gap-3">
                                                        {t.mileage ? (
                                                            <div className="flex flex-col items-center p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] min-w-[75px]">
                                                                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Odômetro</span>
                                                                <span className="text-[13px] font-bold text-[var(--text-primary)] mt-0.5">{t.mileage.toLocaleString('pt-BR')}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[13px] text-[var(--text-muted)] font-medium bg-[var(--bg-secondary)] px-3 py-2 rounded-xl">- Okm -</span>
                                                        )}
                                                        
                                                        {t.liters ? (
                                                            <div className="flex flex-col items-center p-2 rounded-xl bg-[var(--color-despesa-light)] border border-[var(--color-despesa)]/20 min-w-[75px]">
                                                                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-despesa)] opacity-80">Volume L.</span>
                                                                <span className="text-[13px] font-bold text-[var(--color-despesa)] mt-0.5">{t.liters} L</span>
                                                            </div>
                                                        ) : null}

                                                        {seg && !seg.isGapOutlier && seg.kmPerLiter > 0 && (
                                                            <div className="flex flex-col items-center p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 min-w-[75px]">
                                                                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500">Média Leg</span>
                                                                <span className="text-[13px] font-black text-emerald-500 mt-0.5">{seg.kmPerLiter.toFixed(1)} km/l</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-5 text-right">
                                                    <p className="font-black text-[var(--text-primary)] text-[17px] tracking-tight">{formatCurrency(t.amount)}</p>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View Card List */}
                        <div className="lg:hidden divide-y divide-[var(--border-color)]">
                            {monthlyCarTransactions.map((t) => {
                                const catName = categories.find(c => c.id === t.category_id)?.name || '';
                                const isFuel = isFuelTx(t, catName);
                                const seg = segmentMap.get(t.id);
                                const fuelType = seg ? seg.fuelType : detectFuelType(t.description);
                                const fuelInfo = FUEL_TYPES[fuelType] || FUEL_TYPES.gasolina;
                                const displayTitle = cleanFuelDescription(t.description) || (isFuel ? 'Abastecimento' : t.description);

                                return (
                                    <div key={t.id} className="p-5 bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] transition-colors active:scale-[0.98]">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest bg-[var(--bg-secondary)] px-2.5 py-1.5 rounded-lg border border-[var(--border-color)]">
                                                <Calendar size={12} className="text-[var(--color-carro)]" />
                                                {t.date.split('-').reverse().join('/')}
                                            </div>
                                            <span className="font-black text-[var(--text-primary)] text-xl tracking-tight">{formatCurrency(t.amount)}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3.5 rounded-[1.2rem] shadow-sm shrink-0 border ${isFuel ? 'bg-gradient-to-br from-[var(--color-despesa)] to-rose-500 text-white border-rose-500/20' : 'bg-gradient-to-br from-[var(--color-meta)] to-emerald-500 text-white border-emerald-500/20'}`}>
                                                {isFuel ? <Fuel size={20} /> : <Wrench size={20} />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[var(--text-primary)] font-bold truncate text-[16px]">{displayTitle}</p>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                    <span className="text-[10px] text-[var(--text-muted)] font-semibold tracking-wide uppercase">
                                                        {catName || '-'}
                                                    </span>
                                                    {isFuel && (
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${fuelInfo.badgeBg} ${fuelInfo.badgeText} ${fuelInfo.badgeBorder}`}>
                                                            {fuelInfo.icon} {fuelInfo.label}
                                                        </span>
                                                    )}
                                                    {seg?.isGapOutlier && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-md border font-bold bg-amber-500/10 text-amber-500 border-amber-500/20 flex items-center gap-1">
                                                            <RotateCcw size={10} /> Novo Ciclo
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                                                    {t.mileage ? (
                                                        <span className="flex items-center gap-1.5 text-[10px] bg-[var(--bg-secondary)] border border-[var(--border-color)] px-2 py-1 rounded-md text-[var(--text-primary)] font-bold">
                                                            <MapPin size={10} className="text-[var(--text-muted)]" /> {t.mileage.toLocaleString('pt-BR')} KM
                                                        </span>
                                                    ) : null}
                                                    {t.liters ? (
                                                        <span className="flex items-center gap-1.5 text-[10px] bg-[var(--color-despesa-light)] text-[var(--color-despesa)] px-2 py-1 rounded-md font-bold border border-[var(--color-despesa)]/20">
                                                            <Fuel size={10} /> {t.liters} L
                                                        </span>
                                                    ) : null}
                                                    {seg && !seg.isGapOutlier && seg.kmPerLiter > 0 && (
                                                        <span className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-md font-bold border border-emerald-500/20">
                                                            <Activity size={10} /> {seg.kmPerLiter.toFixed(1)} km/l
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* TRIP SIMULATOR */}
            <div className="bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[2.5rem] p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                        <Route size={24} />
                    </div>
                    <div>
                         <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Simulador de Viagem</h3>
                         <p className="text-[var(--text-secondary)] text-sm font-medium">Calcule o custo do trajeto com base na sua média real de eficiência.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        {/* Seletor de combustível da simulação */}
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5 shadow-sm">Simular com qual Combustível?</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSimCombustivelTipo('geral')}
                                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                        simCombustivelTipo === 'geral'
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
                                    }`}
                                >
                                    ⚡ Geral ({globalMetrics.kmPorLitro > 0 ? globalMetrics.kmPorLitro.toFixed(1) : '--'})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSimCombustivelTipo('gasolina');
                                        if (simPrecoCombustivel === 3.90) setSimPrecoCombustivel(5.80);
                                    }}
                                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                        simCombustivelTipo === 'gasolina'
                                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
                                    }`}
                                >
                                    ⛽ Gasolina ({fuelStats.gasolina.kmPorLitro > 0 ? fuelStats.gasolina.kmPorLitro.toFixed(1) : '--'})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSimCombustivelTipo('etanol');
                                        if (simPrecoCombustivel === 5.80) setSimPrecoCombustivel(3.90);
                                    }}
                                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                        simCombustivelTipo === 'etanol'
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
                                    }`}
                                >
                                    🌿 Etanol ({fuelStats.etanol.kmPorLitro > 0 ? fuelStats.etanol.kmPorLitro.toFixed(1) : '--'})
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1 shadow-sm">Distância (KM) Ida e Volta</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={simDistancia} 
                                    onChange={e => setSimDistancia(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] text-lg font-bold rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent block p-4 outline-none transition-all shadow-sm"
                                    placeholder="Ex: 250"
                                />
                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[var(--text-muted)] font-black">KM</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1 shadow-sm">Preço Combustível</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[var(--text-muted)] font-bold">R$</div>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={simPrecoCombustivel} 
                                        onChange={e => setSimPrecoCombustivel(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent block p-4 pl-10 outline-none transition-all shadow-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1 shadow-sm">Taxas / Pedágio</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[var(--text-muted)] font-bold">R$</div>
                                    <input 
                                        type="number" 
                                        value={simPedagios} 
                                        onChange={e => setSimPedagios(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent block p-4 pl-10 outline-none transition-all shadow-sm"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {(() => {
                        const simKml = simCombustivelTipo === 'gasolina' && fuelStats.gasolina.kmPorLitro > 0
                            ? fuelStats.gasolina.kmPorLitro
                            : simCombustivelTipo === 'etanol' && fuelStats.etanol.kmPorLitro > 0
                            ? fuelStats.etanol.kmPorLitro
                            : globalMetrics.kmPorLitro > 0 ? globalMetrics.kmPorLitro : 10;

                        const litrosEstimados = (typeof simDistancia === 'number' && simKml > 0)
                            ? (simDistancia / simKml)
                            : 0;

                        const custoCombustivel = litrosEstimados * (typeof simPrecoCombustivel === 'number' ? simPrecoCombustivel : 0);
                        const custoTotal = custoCombustivel + (typeof simPedagios === 'number' ? simPedagios : 0);
                        const labelTipo = simCombustivelTipo === 'gasolina' ? 'Gasolina' : simCombustivelTipo === 'etanol' ? 'Etanol' : 'Média Geral';

                        return (
                            <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-indigo-500/20">
                                <div className="absolute -right-8 -top-8 bg-white/5 p-4 rounded-full">
                                    <Calculator size={140} className="text-white/10" />
                                </div>
                                
                                <div className="relative z-10 space-y-4">
                                    <div className="flex justify-between items-end border-b border-indigo-400/30 pb-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Combustível Estimado ({labelTipo})</p>
                                            <p className="text-2xl font-black text-white">
                                                {litrosEstimados.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} <span className="text-sm font-bold text-indigo-200">Litros</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Custo Combustível</p>
                                            <p className="text-lg font-bold text-white shadow-sm">
                                                {formatCurrency(custoCombustivel)}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-2 flex flex-col group">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-0.5">Custo Total da Viagem</p>
                                                <div className="text-[9px] text-indigo-300 font-bold uppercase tracking-widest">
                                                    Usando média de {simKml > 0 ? simKml.toFixed(1) : '--'} km/l ({labelTipo})
                                                </div>
                                            </div>
                                            <p className="text-4xl font-black text-white tracking-tighter drop-shadow-md">
                                                {formatCurrency(custoTotal)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}
