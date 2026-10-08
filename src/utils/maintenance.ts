import type { MaintenanceItem } from './userPrefs';

export const MAINTENANCE_PRESETS: { name: string; intervalKm: number }[] = [
    { name: 'Troca de óleo e filtro', intervalKm: 10000 },
    { name: 'Rodízio de pneus', intervalKm: 10000 },
    { name: 'Alinhamento e balanceamento', intervalKm: 10000 },
    { name: 'Filtro de ar', intervalKm: 15000 },
    { name: 'Pastilhas de freio', intervalKm: 30000 },
    { name: 'Correia dentada', intervalKm: 50000 },
];

export interface MaintenanceStatus extends MaintenanceItem {
    currentKm: number;
    nextKm: number;
    remainingKm: number;
    percent: number; // 0-100+ do intervalo já rodado
    level: 'ok' | 'soon' | 'due';
}

// Último KM conhecido de cada veículo (maior odômetro registrado nos lançamentos)
export function currentKmByVehicle(transactions: { vehicle_id: string | null; mileage: number | null }[]): Record<string, number> {
    const map: Record<string, number> = {};
    for (const t of transactions) {
        if (!t.vehicle_id || !t.mileage) continue;
        map[t.vehicle_id] = Math.max(map[t.vehicle_id] || 0, t.mileage);
    }
    return map;
}

export function maintenanceStatus(item: MaintenanceItem, currentKm: number): MaintenanceStatus {
    const km = Math.max(currentKm, item.lastKm);
    const nextKm = item.lastKm + item.intervalKm;
    const remainingKm = nextKm - km;
    const percent = item.intervalKm > 0 ? ((km - item.lastKm) / item.intervalKm) * 100 : 0;
    // Avisa a partir de 10% do intervalo restante (no mínimo 500 km antes)
    const soonThreshold = Math.max(500, item.intervalKm * 0.1);
    const level = remainingKm <= 0 ? 'due' : remainingKm <= soonThreshold ? 'soon' : 'ok';
    return { ...item, currentKm: km, nextKm, remainingKm, percent, level };
}
