import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useNotification } from '../context/NotificationContext';
import { X, Tag } from 'lucide-react';
import type { Database } from '../types/supabase';

type CategoryType = 'expense' | 'revenue' | 'transference';

interface CategoryFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialData?: Database['public']['Tables']['categories']['Row'];
}

export default function CategoryForm({ isOpen, onClose, onSuccess, initialData }: CategoryFormProps) {
    const { user } = useAuth();
    const { refreshData } = useFinance();
    const { showToast } = useNotification();
    const [name, setName] = useState(initialData?.name || '');
    const [type, setType] = useState<CategoryType>((initialData?.type as CategoryType) || 'expense');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setName(initialData?.name || '');
            setType((initialData?.type as CategoryType) || 'expense');
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !type || !user) return;

        setIsSubmitting(true);
        try {
            const payload = {
                name,
                type,
                user_id: user.id
            };

            if (initialData) {
                const { error } = await supabase
                    .from('categories')
                    .update(payload)
                    .eq('id', initialData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('categories')
                    .insert(payload);
                if (error) throw error;
            }

            setName('');
            setType('expense');
            await refreshData();
            showToast(initialData ? 'Categoria atualizada!' : 'Categoria criada!', 'success');
            if (onSuccess) onSuccess();
            onClose();

        } catch (error) {
            console.error('Error saving category:', error);
            showToast('Erro ao salvar categoria.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                    <h2 className="text-xl font-bold text-[var(--color-heading)] flex items-center gap-2">
                        <Tag className="text-[var(--primary)]" />
                        {initialData ? 'Editar Categoria' : 'Nova Categoria'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                            Tipo de Categoria
                        </label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as CategoryType)}
                            className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none"
                            required
                        >
                            <option value="expense">Despesa</option>
                            <option value="revenue">Receita</option>
                            <option value="transference">Ambos / Transferência</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                            Nome da Categoria
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none"
                            placeholder="Ex: Alimentação, Salário, etc."
                            required
                            autoFocus
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-[var(--color-text)] bg-[var(--bg-secondary)] hover:bg-[var(--border)] rounded-md transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !name}
                            className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-md transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
