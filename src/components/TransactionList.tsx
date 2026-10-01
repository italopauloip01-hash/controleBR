import { memo, useState, useCallback } from 'react';
import { useFinance } from '../context/FinanceContext';
import { supabase } from '../utils/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateLocal, formatCurrency } from '../utils/format';
import EditTransactionModal from './EditTransactionModal';
import { TrendingUp, TrendingDown, Edit2, Trash2, Calendar, FileText, Repeat } from 'lucide-react';

interface TransactionListProps {
    transactions: any[];
}

const TransactionRow = memo(({ t, category, onEdit, onDelete }: { t: any, category: any, onEdit: (t: any) => void, onDelete: (id: string) => void }) => {
    const isRevenue = t.type === 'revenue';

    return (
        <tr className="border-b border-[var(--border-color)] hover:bg-[var(--hover-bg)] transition-colors">
            <td className="p-5">
                <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold text-sm">
                    <Calendar size={14} className="text-[var(--text-muted)]" />
                    {!isNaN(new Date(t.date).getTime()) ? format(parseDateLocal(t.date), 'dd/MM/yyyy', { locale: ptBR }) : 'Data Inválida'}
                </div>
            </td>
            <td className="p-5">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl shadow-sm border ${isRevenue ? 'bg-gradient-to-br from-[var(--color-receita)] to-green-500 text-white border-green-500/20' : 'bg-gradient-to-br from-[var(--color-despesa)] to-rose-500 text-white border-rose-500/20'}`}>
                        {isRevenue ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-[var(--text-primary)] font-bold text-[15px]">{t.description}</p>
                            {t.installments > 1 && (
                                <span className="bg-rose-500/10 text-rose-600 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-rose-500/20">
                                    {t.installments}x
                                </span>
                            )}
                            {t.is_fixed && (
                                <Repeat size={12} className="text-[var(--color-receita)] opacity-70" />
                            )}
                        </div>
                        <span className="text-[10px] px-2.5 py-1 rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)] mt-1.5 inline-block font-bold uppercase tracking-widest border border-[var(--border-color)]">
                            {category?.name || 'Geral'}
                        </span>
                    </div>
                </div>
            </td>
            <td className="p-5 text-right">
                <p className={`font-black text-[17px] tracking-tight ${isRevenue ? 'text-[var(--color-receita)]' : 'text-[var(--text-primary)]'}`}>
                    {isRevenue ? '+' : '-'} {formatCurrency(t.amount)}
                </p>
            </td>
            <td className="p-5">
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => onEdit(t)}
                        className="p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-blue-500 hover:border-blue-500 rounded-xl transition-all shadow-sm"
                        title="Editar Lançamento"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => onDelete(t.id)}
                        className="p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-red-500 hover:border-red-500 rounded-xl transition-all shadow-sm"
                        title="Excluir Lançamento"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </td>
        </tr>
    );
});

const TransactionCard = memo(({ t, category, onEdit, onDelete }: { t: any, category: any, onEdit: (t: any) => void, onDelete: (id: string) => void }) => {
    const isRevenue = t.type === 'revenue';

    return (
        <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest bg-[var(--bg-secondary)] px-2.5 py-1.5 rounded-lg border border-[var(--border-color)]">
                    <Calendar size={12} className="text-[var(--text-muted)]" />
                    {!isNaN(new Date(t.date).getTime()) ? format(parseDateLocal(t.date), 'dd/MM/yyyy', { locale: ptBR }) : 'Inválida'}
                </div>
                <span className={`font-black text-xl tracking-tight ${isRevenue ? 'text-[var(--color-receita)]' : 'text-[var(--text-primary)]'}`}>
                    {isRevenue ? '+' : '-'} {formatCurrency(t.amount)}
                </span>
            </div>
            
            <div className="flex items-start gap-4 border-b border-[var(--border-color)] pb-4 mb-4">
                <div className={`p-3.5 rounded-[1.2rem] shadow-sm shrink-0 border ${isRevenue ? 'bg-gradient-to-br from-[var(--color-receita)] to-green-500 text-white border-green-500/20' : 'bg-gradient-to-br from-[var(--color-despesa)] to-rose-500 text-white border-rose-500/20'}`}>
                    {isRevenue ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                </div>
                <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[var(--text-primary)] font-bold text-[16px] pr-2 break-words">{t.description}</p>
                        {t.installments > 1 && (
                            <span className="bg-rose-500/10 text-rose-600 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-rose-500/20">
                                {t.installments}x
                            </span>
                        )}
                        {t.is_fixed && (
                            <Repeat size={12} className="text-[var(--color-receita)] opacity-70" />
                        )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1 font-semibold tracking-wide uppercase">{category?.name || 'Geral'}</p>
                </div>
            </div>

            <div className="flex justify-end gap-3">
                <button
                    onClick={() => onEdit(t)}
                    className="px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-2"
                >
                    <Edit2 size={14}/> Editar
                </button>
                <button
                    onClick={() => onDelete(t.id)}
                    className="px-4 py-2 bg-red-500/10 text-red-600 border border-red-500/20 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-2 hover:bg-red-500/20"
                >
                    <Trash2 size={14}/> Remover
                </button>
            </div>
        </div>
    );
});

function TransactionList({ transactions }: TransactionListProps) {
    const { isLoading, categoryMap } = useFinance();
    const [editingTransaction, setEditingTransaction] = useState<any | null>(null);

    const handleDelete = useCallback(async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir esta transação?')) return;

        try {
            const { error } = await supabase.from('transactions').delete().eq('id', id);
            if (error) throw error;
        } catch (error) {
            console.error('Error deleting transaction:', error);
            alert('Erro ao excluir transação');
        }
    }, []);

    const handleEdit = useCallback((t: any) => {
        setEditingTransaction(t);
    }, []);

    if (isLoading) {
        return <div className="text-[var(--text-secondary)] text-sm font-medium animate-pulse p-4">Carregando transações...</div>;
    }

    if (transactions.length === 0) {
        return (
            <div className="py-16 px-4 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2rem] flex flex-col items-center justify-center shadow-sm">
                <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mb-5 border border-[var(--border-color)] shadow-inner">
                    <FileText className="text-[var(--text-muted)] opacity-50" size={32} />
                </div>
                <p className="text-[var(--text-primary)] font-black text-xl tracking-tight mb-2">Relatório Vazio</p>
                <p className="text-[var(--text-secondary)] text-sm max-w-sm mx-auto">Nenhuma movimentação foi encontrada para este período. O fluxo está tranquilo por enquanto.</p>
            </div>
        );
    }

    return (
        <>
            {/* Versão Desktop (Tabela Moderna) */}
            <div className="hidden lg:block bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[var(--bg-secondary)]/50 border-b border-[var(--border-color)]">
                                <th className="p-5 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Data</th>
                                <th className="p-5 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Descrição e Categoria</th>
                                <th className="p-5 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)] text-right">Valor Final</th>
                                <th className="p-5 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)] text-right">Controles</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((t) => (
                                <TransactionRow 
                                    key={t.id} 
                                    t={t} 
                                    category={categoryMap[t.category_id!]} 
                                    onEdit={handleEdit} 
                                    onDelete={handleDelete} 
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Versão Mobile (Cards Inteligentes e Imersivos) */}
            <div className="lg:hidden flex flex-col gap-4">
                {transactions.map(t => (
                    <TransactionCard 
                        key={t.id} 
                        t={t} 
                        category={categoryMap[t.category_id!]} 
                        onEdit={handleEdit} 
                        onDelete={handleDelete} 
                    />
                ))}
            </div>

            <EditTransactionModal
                isOpen={!!editingTransaction}
                onClose={() => setEditingTransaction(null)}
                transaction={editingTransaction}
            />
        </>
    );
}

export default memo(TransactionList);
