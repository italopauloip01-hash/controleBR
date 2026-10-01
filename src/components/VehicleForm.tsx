import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { X } from 'lucide-react';

interface VehicleFormProps {
    vehicle?: any;
    onClose?: () => void;
}

export default function VehicleForm({ vehicle, onClose }: VehicleFormProps) {
    const { showToast } = useNotification();
    const [name, setName] = useState('');
    const [plate, setPlate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { refreshData } = useFinance();
    const { user } = useAuth();

    const isEditing = !!vehicle;

    useEffect(() => {
        if (vehicle) {
            setName(vehicle.name || '');
            setPlate(vehicle.plate || '');
        }
    }, [vehicle]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !plate || !user) return;

        setIsSubmitting(true);
        try {
            if (isEditing) {
                const { error } = await supabase
                    .from('vehicles')
                    .update({
                        name,
                        plate: plate.toUpperCase(),
                    })
                    .eq('id', vehicle.id);

                if (error) throw error;
            } else {
                const { error } = await supabase.from('vehicles').insert({
                    name,
                    plate: plate.toUpperCase(),
                    user_id: user.id
                });

                if (error) throw error;
            }

            if (!isEditing) {
                setName('');
                setPlate('');
            }
            
            await refreshData();
            showToast(isEditing ? 'Veículo atualizado com sucesso!' : 'Veículo adicionado com sucesso!', 'success');
            if (onClose) onClose();
        } catch (error) {
            console.error('Error saving vehicle:', error);
            showToast('Erro ao salvar veículo. Verifique se a placa já não está cadastrada.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="card p-6 border border-[var(--border)] rounded-lg mb-6 relative">
            {onClose && (
                <button 
                    type="button" 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1"
                >
                    <X size={20} />
                </button>
            )}

            <h2 className="text-xl font-bold text-[var(--color-heading)] mb-4">
                {isEditing ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                        Nome do Veículo
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)] outline-none focus:border-[var(--color-carro)]"
                        placeholder="Ex: Gol Quadrado, Moto CG..."
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                        Placa
                    </label>
                    <input
                        type="text"
                        value={plate}
                        onChange={(e) => setPlate(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-[var(--bg-secondary)] text-[var(--color-text)] outline-none focus:border-[var(--color-carro)] uppercase"
                        placeholder="ABC-1234"
                        maxLength={8}
                        required
                    />
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-[var(--color-carro)] text-white font-medium py-2.5 px-6 rounded-md hover:bg-opacity-90 transition-all disabled:opacity-50 shadow-sm"
                >
                    {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Adicionar Veículo'}
                </button>
                
                {isEditing && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 border border-[var(--border)] rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all font-medium"
                    >
                        Cancelar
                    </button>
                )}
            </div>
        </form>
    );
}
