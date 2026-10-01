import { useFinance } from '../context/FinanceContext';
import { supabase } from '../utils/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import EditGoalModal from './EditGoalModal';
import { useNotification } from '../context/NotificationContext';
import { Trash2, Edit2, Target, Calendar, Award } from 'lucide-react';
import { formatCurrency } from '../utils/format';

export default function GoalList() {
    const { goals, isLoading, refreshData } = useFinance();
    const { confirmAction, showToast } = useNotification();
    const [editingGoal, setEditingGoal] = useState<any | null>(null);

    const handleDelete = async (id: string, name: string) => {
        const confirmed = await confirmAction({
            title: 'Excluir Meta',
            message: `Tem certeza que deseja desistir da meta "${name}" e apagá-la do painel?`,
            confirmText: 'Excluir',
            cancelText: 'Manter'
        });

        if (!confirmed) return;

        try {
            const { error } = await supabase.from('goals').delete().eq('id', id);
            if (error) throw error;
            await refreshData();
            showToast('Meta excluída com sucesso!', 'success');
        } catch (error) {
            console.error('Error deleting goal:', error);
            showToast('Erro ao excluir meta.', 'error');
        }
    };

    if (isLoading) {
        return <div className="text-[var(--text-secondary)] text-sm font-bold uppercase tracking-widest animate-pulse">Carregando mapa de metas...</div>;
    }

    if (goals.length === 0) {
        return (
            <div className="py-16 px-4 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2rem] flex flex-col items-center justify-center shadow-sm">
                <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mb-5 border border-[var(--border-color)] shadow-inner">
                    <Target className="text-[var(--text-muted)] opacity-50" size={32} />
                </div>
                <p className="text-[var(--text-primary)] font-black text-xl tracking-tight mb-2">Sem Objetivos Claros</p>
                <p className="text-[var(--text-secondary)] text-sm max-w-sm mx-auto">Você não configurou nenhuma meta ainda. Defina onde quer chegar para habilitar os trackers.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <h3 className="font-bold text-[var(--text-primary)] uppercase tracking-wide text-sm mb-6 flex items-center gap-2">
                <Award size={18} className="text-[var(--text-secondary)]" /> Alvos Vigentes
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {goals.map(goal => {
                    const percentage = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
                    const isCompleted = percentage >= 100;

                    return (
                        <div 
                            key={goal.id} 
                            className={`relative rounded-[2rem] p-6 text-[var(--text-primary)] overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-1 group bg-[var(--bg-card)] border ${isCompleted ? 'border-emerald-500/30' : 'border-[var(--border-color)]'}`}
                        >
                            {/* Background FX for completed goals */}
                            {isCompleted && (
                                <div className="absolute top-0 right-0 p-4 opacity-5 text-emerald-500">
                                    <Award size={120} />
                                </div>
                            )}

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex flex-col">
                                        <span className="font-black text-xl tracking-tight leading-tight max-w-[200px] truncate">{goal.name}</span>
                                        <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mt-1.5">
                                            <Calendar size={12}/> {!isNaN(new Date(goal.deadline).getTime()) ? format(new Date(goal.deadline), 'MMM yyyy', { locale: ptBR }) : '-'}
                                        </span>
                                    </div>
                                    <div className={`p-3 rounded-2xl shadow-sm shrink-0 border ${isCompleted ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white border-emerald-500/20' : 'bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-card)] text-[var(--color-meta)] border-[var(--border-color)]'}`}>
                                        <Target size={24} />
                                    </div>
                                </div>

                                <div className="mb-2 flex items-end justify-between">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold mb-1">Status de Fundo</p>
                                        <p className={`text-2xl font-black tracking-tighter truncate drop-shadow-sm ${isCompleted ? 'text-emerald-500' : 'text-[var(--text-primary)]'}`}>
                                            {formatCurrency(goal.current_amount)}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-[11px] font-semibold text-[var(--text-secondary)]">
                                    de <span className="font-bold text-[var(--text-primary)]">{formatCurrency(goal.target_amount)}</span>
                                </p>

                                {/* Progress Bar Glow */}
                                <div className="mt-5">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{percentage.toFixed(1)}% Completo</span>
                                        {isCompleted && <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-lg">Atingida!</span>}
                                    </div>
                                    <div className="w-full bg-[var(--bg-secondary)] rounded-full h-2.5 overflow-hidden border border-[var(--border-color)]">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-[var(--color-meta)]'}`}
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end gap-2 border-t border-[var(--border-color)] pt-4">
                                    <button
                                        onClick={() => setEditingGoal(goal)}
                                        className="p-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--hover-bg)] border border-[var(--border-color)] rounded-xl text-[var(--text-secondary)] hover:text-blue-500 transition-colors flex items-center justify-center shadow-sm"
                                        title="Editar Meta"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(goal.id, goal.name)}
                                        className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 rounded-xl transition-colors flex items-center justify-center shadow-sm"
                                        title="Excluir Meta"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <EditGoalModal
                isOpen={!!editingGoal}
                onClose={() => setEditingGoal(null)}
                goal={editingGoal}
            />
        </div>
    );
}
