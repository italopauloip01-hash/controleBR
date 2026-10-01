import { useFinance } from '../context/FinanceContext';
import { supabase } from '../utils/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { Trash2, Edit2, TrendingUp, DollarSign, Calendar, PiggyBank } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import EditInvestmentModal from './EditInvestmentModal';
import RedeemInvestmentModal from './RedeemInvestmentModal';
import { useNotification } from '../context/NotificationContext';

export default function InvestmentList() {
    const { investments, isLoading, refreshData } = useFinance();
    const { confirmAction, showToast } = useNotification();
    const [editingInvestment, setEditingInvestment] = useState<any | null>(null);
    const [redeemingInvestment, setRedeemingInvestment] = useState<any | null>(null);

    const handleDelete = async (id: string, name: string) => {
        const confirmed = await confirmAction({
            title: 'Excluir Ativo',
            message: `Tem certeza que deseja apagar o fundo/ativo "${name}" do seu painel corporativo?`,
            confirmText: 'Excluir',
            cancelText: 'Manter'
        });

        if (!confirmed) return;

        try {
            const { error } = await supabase.from('investments').delete().eq('id', id);
            if (error) throw error;
            await refreshData();
            showToast('Ativo excluído com sucesso!', 'success');
        } catch (error) {
            console.error('Error deleting investment:', error);
            showToast('Erro ao excluir ativo.', 'error');
        }
    };

    if (isLoading) {
        return <div className="text-[var(--text-secondary)] text-sm font-bold uppercase tracking-widest animate-pulse">Sincronizando bolsa...</div>;
    }

    if (investments.length === 0) {
        return (
            <div className="py-16 px-4 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2rem] flex flex-col items-center justify-center shadow-sm">
                <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mb-5 border border-[var(--border-color)] shadow-inner">
                    <PiggyBank className="text-[var(--text-muted)] opacity-50" size={32} />
                </div>
                <p className="text-[var(--text-primary)] font-black text-xl tracking-tight mb-2">Carteira Vazia</p>
                <p className="text-[var(--text-secondary)] text-sm max-w-sm mx-auto">Você não tem ativos associados. Aplique seu dinheiro para ver os gráficos subirem.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <h3 className="font-bold text-[var(--text-primary)] uppercase tracking-wide text-sm mb-6 flex items-center gap-2">
                <TrendingUp size={18} className="text-[var(--text-secondary)]" /> Meus Ativos
            </h3>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {investments.map(inv => {
                    const totalValue = inv.amount + inv.yield;
                    const yieldPercentage = inv.amount > 0 ? (inv.yield / inv.amount) * 100 : 0;
                    const isProfitable = inv.yield >= 0;

                    return (
                         <div 
                            key={inv.id} 
                            className="relative rounded-[2rem] p-6 text-[var(--text-primary)] overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-1 group bg-[var(--bg-card)] border border-[var(--border-color)]"
                        >
                            <div className="relative z-10 flex flex-col h-full">
                                {/* Header do Card */}
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex flex-col">
                                        <span className="font-black text-[18px] tracking-tight leading-tight max-w-[200px] truncate">{inv.name}</span>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="px-2.5 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg text-[9px] font-bold uppercase tracking-widest">
                                                {inv.type}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest">
                                                <Calendar size={12}/> {!isNaN(new Date(inv.date).getTime()) ? format(new Date(inv.date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20">
                                        <DollarSign size={24} />
                                    </div>
                                </div>

                                {/* Valores */}
                                <div className="flex justify-between items-end border-b border-[var(--border-color)] pb-5 mb-5">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold mb-1">Valor Bruto Operado</p>
                                        <p className="text-2xl font-black text-[var(--text-primary)] tracking-tighter drop-shadow-sm truncate">
                                            {formatCurrency(totalValue)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold mb-1">Rendimento</p>
                                        <p className={`font-black text-lg tracking-tight drop-shadow-sm flex items-center justify-end gap-1 ${isProfitable ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {isProfitable ? '+' : ''}{formatCurrency(inv.yield)}
                                        </p>
                                        <p className={`text-[10px] uppercase tracking-widest font-bold ${isProfitable ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
                                             ({yieldPercentage.toFixed(2)}%)
                                        </p>
                                    </div>
                                </div>

                                {/* Controles */}
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setRedeemingInvestment(inv)}
                                        className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-500 rounded-xl transition-colors flex items-center justify-center shadow-sm font-bold text-xs uppercase tracking-wider"
                                        title="Resgatar"
                                    >
                                        Resgatar Fundos
                                    </button>
                                    <button
                                        onClick={() => setEditingInvestment(inv)}
                                        className="p-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--hover-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text-secondary)] hover:text-blue-500 transition-colors flex items-center justify-center shadow-sm"
                                        title="Editar"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(inv.id, inv.name)}
                                        className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 rounded-xl transition-colors flex items-center justify-center shadow-sm"
                                        title="Excluir"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <EditInvestmentModal
                isOpen={!!editingInvestment}
                onClose={() => setEditingInvestment(null)}
                investment={editingInvestment}
            />

            <RedeemInvestmentModal
                isOpen={!!redeemingInvestment}
                onClose={() => setRedeemingInvestment(null)}
                investment={redeemingInvestment}
            />
        </div>
    );
}
