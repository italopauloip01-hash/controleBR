import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { supabase } from '../utils/supabase';
import { useNotification } from '../context/NotificationContext';
import { Tags, Plus, Pencil, Trash2, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';
import CategoryForm from '../components/CategoryForm';
import type { Database } from '../types/supabase';

type Category = Database['public']['Tables']['categories']['Row'];

export default function Categorias() {
    const { categories, transactions, refreshData } = useFinance();
    const { showToast, confirmAction } = useNotification();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [categoryToEdit, setCategoryToEdit] = useState<Category | undefined>();

    const handleEdit = (category: Category) => {
        setCategoryToEdit(category);
        setIsFormOpen(true);
    };

    const handleCreateNew = () => {
        setCategoryToEdit(undefined);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        const isInUse = transactions.some(t => t.category_id === id);
        if (isInUse) {
            showToast(`"${name}" está vinculada a transações passadas e não pode ser apagada.`, 'error');
            return;
        }

        const confirmed = await confirmAction({
            title: 'Excluir Categoria',
            message: `Você vai apagar definitivamente a categoria "${name}". Prosseguir?`,
            confirmText: 'Excluir',
            cancelText: 'Manter'
        });
        
        if (!confirmed) return;

        try {
            const { error } = await supabase.from('categories').delete().eq('id', id);
            if (error) throw error;
            await refreshData();
            showToast('Categoria removida das listas!', 'success');
        } catch (error) {
            console.error('Error deleting category:', error);
            showToast('Falha crítica ao apagar categoria.', 'error');
        }
    };

    const expenseCategories = categories.filter(c => c.type === 'expense');
    const revenueCategories = categories.filter(c => c.type === 'revenue');
    const transferCategories = categories.filter(c => c.type === 'transference' || !c.type);

    const renderCategoryList = (title: string, icon: React.ReactNode, list: Category[], accentColor: string) => (
        <div className={`bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow`}>
            <div className={`flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border-color)]`}>
                <div className={`p-2 rounded-xl bg-${accentColor}-500/10 text-${accentColor}-500 border border-${accentColor}-500/20`}>
                    {icon}
                </div>
                <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight">{title}</h2>
                <span className="ml-auto bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs font-bold px-3 py-1 rounded-full border border-[var(--border-color)] shadow-inner">
                    {list.length}
                </span>
            </div>

            {list.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-center opacity-50">
                    {icon}
                    <p className="font-bold text-[var(--text-primary)] mt-3">Sem rótulos</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {list.map(category => (
                        <li key={category.id} className="group relative flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-blue-500/50 transition-all overflow-hidden">
                            
                            <div className="flex items-center gap-3 z-10">
                                <span className="font-bold text-[var(--text-primary)] text-sm tracking-wide">{category.name}</span>
                            </div>

                            <div className="flex items-center gap-2 z-10">
                                <button
                                    onClick={() => handleEdit(category)}
                                    className="p-2 text-[var(--text-secondary)] hover:text-blue-500 bg-[var(--bg-card)] hover:bg-white border border-[var(--border-color)] hover:border-blue-500/50 rounded-xl transition-all shadow-sm active:scale-95"
                                    title="Editar"
                                >
                                    <Pencil size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(category.id, category.name)}
                                    className="p-2 text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 rounded-xl transition-all shadow-sm active:scale-95"
                                    title="Excluir"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in pb-24 lg:pb-8">
            {/* Header Moderno */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black text-[var(--text-primary)] flex items-center gap-3 tracking-tight">
                        <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                            <Tags className="text-white" size={28} />
                        </div>
                        Centro de Categorias
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-2 font-medium">Classifique e crie regras de taxonomia nativas para suas transações.</p>
                </div>

                <button
                    onClick={handleCreateNew}
                    className="w-full xl:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 active:scale-95 border border-blue-400"
                >
                    <Plus size={20} />
                    CRIAR RÓTULO
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {renderCategoryList('Despesas', <TrendingDown size={20}/>, expenseCategories, 'rose')}
                {renderCategoryList('Receitas', <TrendingUp size={20}/>, revenueCategories, 'emerald')}
                {renderCategoryList('Outros / Múltiplos', <ArrowRightLeft size={20}/>, transferCategories, 'slate')}
            </div>

            <CategoryForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                initialData={categoryToEdit}
            />
        </div>
    );
}
