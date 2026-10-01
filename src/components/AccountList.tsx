import { useFinance } from '../context/FinanceContext';
import { supabase } from '../utils/supabase';
import { useNotification } from '../context/NotificationContext';
import { Trash2, Edit2, Landmark, Nfc, Building2 } from 'lucide-react';
import { useState } from 'react';
import EditAccountModal from './EditAccountModal';
import { formatCurrency } from '../utils/format';

export default function AccountList() {
    const { accounts, isLoading, refreshData } = useFinance();
    const { confirmAction, showToast } = useNotification();
    const [editingAccount, setEditingAccount] = useState<any | null>(null);

    const handleDelete = async (id: string, name: string) => {
        const confirmed = await confirmAction({
            title: 'Remover Conta',
            message: `Tem certeza que deseja apagar a conta "${name}" e desvinculá-la do painel?`,
            confirmText: 'Excluir',
            cancelText: 'Manter'
        });

        if (!confirmed) return;

        try {
            const { error } = await supabase.from('accounts').delete().eq('id', id);
            if (error) throw error;
            await refreshData();
            showToast('Conta cortada com sucesso!', 'success');
        } catch (error: any) {
            console.error('Error deleting account:', error);
            showToast(`Erro ao remover conta: ${error.message || 'Erro desconhecido'}`, 'error');
        }
    };

    if (isLoading) {
        return <div className="text-[var(--text-secondary)] text-sm font-bold uppercase tracking-widest animate-pulse">Acessando cofres...</div>;
    }

    if (accounts.length === 0) {
        return (
            <div className="py-16 px-4 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2rem] flex flex-col items-center justify-center shadow-sm">
                <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mb-5 border border-[var(--border-color)] shadow-inner">
                    <Building2 className="text-[var(--text-muted)] opacity-50" size={32} />
                </div>
                <p className="text-[var(--text-primary)] font-black text-xl tracking-tight mb-2">Carteira Vazia</p>
                <p className="text-[var(--text-secondary)] text-sm max-w-sm mx-auto">Você não tem nenhuma conta cadastrada. Crie a primeira para dar vida ao controle.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <h3 className="font-bold text-[var(--text-primary)] uppercase tracking-wide text-sm mb-6 flex items-center gap-2">
                <Landmark size={18} className="text-[var(--text-secondary)]" /> Seus Bancos Ativos
            </h3>
            
            {/* Wallet Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {accounts.map(account => (
                    <div 
                        key={account.id} 
                        className="relative rounded-[2rem] p-6 text-white overflow-hidden shadow-md hover:shadow-xl transition-all hover:-translate-y-1 group"
                        style={{
                            background: account.balance >= 0 
                                ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' 
                                : 'linear-gradient(135deg, #4c0519 0%, #171717 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        {/* Overlay FX */}
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Landmark size={80} />
                        </div>
                        <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white rounded-full mix-blend-overlay opacity-[0.03] blur-xl"></div>
                        
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex flex-col">
                                    <span className="font-bold text-lg tracking-tight leading-tight">{account.name}</span>
                                    <span className="text-[9px] uppercase tracking-widest text-white/50 font-bold mt-1">{account.type}</span>
                                </div>
                                <Nfc size={20} className="text-white/30 rotate-90" />
                            </div>

                            <div className="mt-4 mb-2">
                                <p className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-1">Saldo Atual</p>
                                <p className={`text-3xl font-black ${account.balance >= 0 ? 'text-white' : 'text-rose-300'} tracking-tighter truncate drop-shadow-sm`}>
                                    {formatCurrency(account.balance)}
                                </p>
                            </div>

                            <div className="mt-8 flex justify-end gap-2 border-t border-white/10 pt-4">
                                <button
                                    onClick={() => setEditingAccount(account)}
                                    className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white transition-colors flex items-center justify-center backdrop-blur-sm shadow-sm"
                                    title="Editar Conta"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(account.id, account.name)}
                                    className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 rounded-xl transition-colors flex items-center justify-center backdrop-blur-sm shadow-sm"
                                    title="Excluir Conta"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <EditAccountModal
                isOpen={!!editingAccount}
                onClose={() => setEditingAccount(null)}
                account={editingAccount}
            />
        </div>
    );
}
