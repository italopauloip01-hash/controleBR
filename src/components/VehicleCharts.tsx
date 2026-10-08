import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import type { FuelSegmentCalculation } from '../utils/fuelUtils';

interface FuelTx {
    id: string;
    date: string;
    amount: number;
    liters: number | null;
}

interface VehicleChartsProps {
    fuelTransactions: FuelTx[];
    segmentMap: Map<string, FuelSegmentCalculation>;
}

const shortDate = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(2, 4);

// Evolução do consumo (km/l por abastecimento) e do preço do litro
export default function VehicleCharts({ fuelTransactions, segmentMap }: VehicleChartsProps) {
    const data = useMemo(() => fuelTransactions
        .filter(t => (t.liters || 0) > 0)
        .map(t => {
            const seg = segmentMap.get(t.id);
            return {
                date: t.date,
                label: shortDate(t.date),
                kml: seg && !seg.isGapOutlier && seg.kmPerLiter > 0 ? +seg.kmPerLiter.toFixed(2) : null,
                preco: +(t.amount / (t.liters as number)).toFixed(3),
            };
        })
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-24), [fuelTransactions, segmentMap]);

    const hasKml = data.some(d => d.kml != null);
    if (data.length < 2) return null;

    const tooltipStyle = {
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 700,
    };

    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                    <TrendingUp size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-[var(--text-primary)] uppercase tracking-wide text-sm">Consumo e Preço</h3>
                    <p className="text-[11px] text-[var(--text-secondary)] font-medium">Últimos {data.length} abastecimentos</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {hasKml && (
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Média km/l por abastecimento</p>
                        <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v).toFixed(1)} km/l`, 'Média']} />
                                    <Line type="monotone" dataKey="kml" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
                <div className={hasKml ? '' : 'lg:col-span-2'}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2">Preço pago por litro</p>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(v) => Number(v).toFixed(2)} />
                                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Litro']} />
                                <Line type="monotone" dataKey="preco" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
