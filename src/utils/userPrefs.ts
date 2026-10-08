// Preferências do usuário (orçamentos por categoria, plano de manutenção dos veículos).
// Ficam no perfil do Supabase Auth (user_metadata.app_prefs): sincronizam entre aparelhos
// sem precisar de tabela nova no banco.
import { useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from '../context/AuthContext';

export interface MaintenanceItem {
    id: string;
    vehicleId: string;
    name: string;
    intervalKm: number;
    lastKm: number; // KM do odômetro na última vez que foi feita
}

export interface AppPrefs {
    budgets?: Record<string, number>; // category_id -> limite mensal em R$
    maintenance?: MaintenanceItem[];
}

export function useUserPrefs() {
    const { user } = useAuth();
    const prefs: AppPrefs = (user?.user_metadata?.app_prefs as AppPrefs) || {};

    const savePrefs = useCallback(async (patch: Partial<AppPrefs>) => {
        const current = (user?.user_metadata?.app_prefs as AppPrefs) || {};
        const { error } = await supabase.auth.updateUser({ data: { app_prefs: { ...current, ...patch } } });
        if (error) throw error;
    }, [user]);

    return { prefs, savePrefs };
}

export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
