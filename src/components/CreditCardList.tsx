import { useFinance } from '../context/FinanceContext';
import { supabase } from '../utils/supabase';
import { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { Trash2, Edit2, CreditCard, Nfc, FileText } from 'lucide-react';
import CreditCardInvoiceModal from './CreditCardInvoiceModal';
import EditCreditCardModal from './EditCreditCardModal';
import { formatCurrency } from '../utils/format';

export default function CreditCardList() {
    const { creditCards, isLoading, refreshData } = useFinance();
    const { confirmAction, showToast } = useNotification();
    const [selectedCard, setSelectedCard] = useState<any | null>(null);
    const [editingCard, setEditingCard] = useState<any | null>(null);

    const handleDelete = async (id: string, name: string) => {
        const confirmed = await confirmAction({
            title: 'Cortar Cartão',
            message: `Tem certeza que deseja apagar permanentemente o cartão "${name}"? Todas as faturas associadas com esse plástico irão desaparecer.`,
            confirmText: 'Excluir',
            cancelText: 'Manter'
        });

        if (!confirmed) return;

        try {
            const { error } = await supabase.from('credit_cards').delete().eq('id', id);
            if (error) throw error;
            await refreshData();
            showToast('Cartão cortado com sucesso!', 'success');
        } catch (error: any) {
            console.error('Error deleting card:', error);
            showToast(`Erro ao cortar cartão: ${error.message || 'Desconhecido'}`, 'error');
        }
    };

    if (isLoading) {
        return <div className="text-[var(--text-secondary)] text-sm font-bold uppercase tracking-widest animate-pulse">Acessando Emissão...</div>;
    }

    if (creditCards.length === 0) {
        return (
            <div className="py-16 px-4 text-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[2rem] flex flex-col items-center justify-center shadow-sm">
                <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mb-5 border border-[var(--border-color)] shadow-inner">
                    <CreditCard className="text-[var(--text-muted)] opacity-50" size={32} />
                </div>
                <p className="text-[var(--text-primary)] font-black text-xl tracking-tight mb-2">Carteira Vazia</p>
                <p className="text-[var(--text-secondary)] text-sm max-w-sm mx-auto">Você não tem nenhum cartão de crédito cadastrado na plataforma.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <h3 className="font-bold text-[var(--text-primary)] uppercase tracking-wide text-sm mb-6 flex items-center gap-2">
                <CreditCard size={18} className="text-[var(--text-secondary)]" /> Seus Plásticos Ativos
            </h3>
            
            {/* Credit Card Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {creditCards.map((card, index) => {
                    // Alternate colors dynamically to simulate physical cards colors
                    let bgStyle = 'linear-gradient(135deg, #111827 0%, #1f2937 100%)';
                    if (index % 3 === 1) bgStyle = 'linear-gradient(135deg, #3730a3 0%, #1e1b4b 100%)';
                    if (index % 3 === 2) bgStyle = 'linear-gradient(135deg, #0f766e 0%, #042f2e 100%)';

                    return (
                        <div 
                            key={card.id} 
                            className="relative rounded-[1.5rem] p-6 text-white overflow-hidden shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group border border-white/10"
                            style={{ background: bgStyle }}
                        >
                            {/* Card Chip & Network */}
                            <div className="flex justify-between items-center mb-10">
                                <div className="w-12 h-9 rounded-md bg-gradient-to-br from-[#d4af37] to-[#8a7322] border border-[#f3e5ab]/30 flex flex-col justify-evenly px-2 items-center opacity-90 shadow-inner">
                                   <div className="w-full border-t border-black/20"></div>
                                   <div className="w-full border-t border-black/20"></div>
                                </div>
                                <Nfc size={24} className="text-white/40" />
                            </div>

                            <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                                <CreditCard size={120} />
                            </div>

                            {/* Card Details */}
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="mb-4">
                                    <p className="font-mono text-xl md:text-2xl tracking-widest text-white/90 drop-shadow-md font-bold">
                                        •••• •••• •••• {(Math.random() * 9000 + 1000).toFixed(0).substring(0,4)}
                                    </p>
                                </div>

                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[9px] uppercase tracking-widest text-white/50 font-bold mb-1">Nome no Cartão</p>
                                        <p className="font-bold tracking-widest text-sm uppercase text-white/90">{card.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] uppercase tracking-widest text-white/50 font-bold mb-1">Limite Total</p>
                                        <p className="font-black text-xl tracking-tight drop-shadow-sm">{formatCurrency(card.limit)}</p>
                                    </div>
                                </div>

                                {/* Extracted Info Drawer */}
                                <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4 gap-2">
                                    <div className="flex gap-4">
                                        <div>
                                            <p className="text-[8px] uppercase tracking-widest text-white/40 font-bold">Fecha</p>
                                            <p className="font-mono text-xs font-bold text-white/80">Dia {card.closing_day}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] uppercase tracking-widest text-white/40 font-bold">Vence</p>
                                            <p className="font-mono text-xs font-bold text-white/80">Dia {card.due_day}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setSelectedCard(card)}
                                            className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 backdrop-blur-sm font-bold text-[10px] uppercase tracking-wider"
                                            title="Ver Fatura"
                                        >
                                            <FileText size={14} /> Fatura
                                        </button>
                                        <button
                                            onClick={() => setEditingCard(card)}
                                            className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-white transition-colors flex items-center justify-center backdrop-blur-sm"
                                            title="Editar Cartão"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(card.id, card.name)}
                                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 rounded-lg transition-colors flex items-center justify-center backdrop-blur-sm"
                                            title="Excluir Cartão"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <CreditCardInvoiceModal
                isOpen={!!selectedCard}
                onClose={() => setSelectedCard(null)}
                card={selectedCard}
            />

            <EditCreditCardModal
                isOpen={!!editingCard}
                onClose={() => setEditingCard(null)}
                card={editingCard}
            />
        </div>
    );
}
