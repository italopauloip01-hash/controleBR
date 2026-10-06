export type FuelType = 'gasolina' | 'etanol' | 'diesel' | 'gnv';

export interface FuelTypeInfo {
    label: string;
    shortLabel: string;
    icon: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
}

export const FUEL_TYPES: Record<FuelType, FuelTypeInfo> = {
    gasolina: {
        label: 'Gasolina',
        shortLabel: 'Gas.',
        icon: '⛽',
        badgeBg: 'bg-amber-500/10',
        badgeText: 'text-amber-500',
        badgeBorder: 'border-amber-500/20'
    },
    etanol: {
        label: 'Etanol',
        shortLabel: 'Eta.',
        icon: '🌿',
        badgeBg: 'bg-emerald-500/10',
        badgeText: 'text-emerald-500',
        badgeBorder: 'border-emerald-500/20'
    },
    diesel: {
        label: 'Diesel',
        shortLabel: 'Die.',
        icon: '🚛',
        badgeBg: 'bg-blue-500/10',
        badgeText: 'text-blue-500',
        badgeBorder: 'border-blue-500/20'
    },
    gnv: {
        label: 'GNV',
        shortLabel: 'GNV',
        icon: '💨',
        badgeBg: 'bg-cyan-500/10',
        badgeText: 'text-cyan-500',
        badgeBorder: 'border-cyan-500/20'
    }
};

export const RESET_CYCLE_TAG = '[NOVO_CICLO]';
export const RESET_CYCLE_ALIASES = ['[NOVO_CICLO]', '[RESET_MEDIA]', '[RESET]', '[INTERVALO]'];

// Máxima distância plausível para 1 tanque sem abastecimento intermediário
export const MAX_PLAUSIBLE_TANK_KM = 900;
// Faixa de km/l aceitável para carros de passeio / utilitários comuns
export const MAX_PLAUSIBLE_KML = 32;
export const MIN_PLAUSIBLE_KML = 3.5;

/**
 * Identifica o tipo de combustível pela descrição
 */
export function detectFuelType(description: string = ''): FuelType {
    const d = (description || '').toLowerCase();
    if (d.includes('[etanol]') || d.includes('etanol') || d.includes('álcool') || d.includes('alcool')) {
        return 'etanol';
    }
    if (d.includes('[diesel]') || d.includes('diesel')) {
        return 'diesel';
    }
    if (d.includes('[gnv]') || d.includes('gnv') || d.includes('gás natural') || d.includes('gas natural')) {
        return 'gnv';
    }
    // Padrão no Brasil ou quando marcado gasolina
    return 'gasolina';
}

/**
 * Checa se a transação possui tag explícita de reinício de ciclo
 */
export function hasResetCycleTag(description: string = ''): boolean {
    const upper = (description || '').toUpperCase();
    return RESET_CYCLE_ALIASES.some(tag => upper.includes(tag));
}

/**
 * Remove tags automáticas de combustível e reset da descrição para exibição limpa
 */
export function cleanFuelDescription(description: string = ''): string {
    let cleaned = description || '';
    const tagsToRemove = [
        '[Gasolina]', '[Etanol]', '[Diesel]', '[GNV]',
        '[gasolina]', '[etanol]', '[diesel]', '[gnv]',
        ...RESET_CYCLE_ALIASES
    ];
    tagsToRemove.forEach(tag => {
        cleaned = cleaned.replaceAll(tag, '');
    });
    return cleaned.trim();
}

/**
 * Formata a descrição incluindo as tags de combustível e reset de ciclo
 */
export function buildFuelDescription(
    rawDescription: string,
    fuelType: FuelType,
    isResetCycle: boolean
): string {
    const cleaned = cleanFuelDescription(rawDescription);
    const fuelLabel = FUEL_TYPES[fuelType]?.label || 'Gasolina';
    const fuelTag = `[${fuelLabel}]`;
    const resetTag = isResetCycle ? ` ${RESET_CYCLE_TAG}` : '';

    if (!cleaned) {
        return `${fuelTag}${resetTag} Abastecimento`;
    }
    return `${fuelTag}${resetTag} ${cleaned}`;
}

export interface FuelSegmentCalculation {
    transactionId: string;
    fuelType: FuelType;
    dist: number;
    liters: number;
    kmPerLiter: number;
    isReset: boolean;
    isGapOutlier: boolean;
    gapReason?: string;
    amount: number;
    date: string;
}

export interface FuelStats {
    totalKmRodados: number;
    totalCombustivelGasto: number;
    custoMedioPorKm: number;
    
    // Média Geral
    mediaGeralKmPorLitro: number;
    
    // Média por Combustível
    gasolina: {
        kmPorLitro: number;
        totalKm: number;
        totalLitros: number;
        totalGasto: number;
        custoPorKm: number;
        abastecimentosCount: number;
    };
    etanol: {
        kmPorLitro: number;
        totalKm: number;
        totalLitros: number;
        totalGasto: number;
        custoPorKm: number;
        abastecimentosCount: number;
    };
    diesel: {
        kmPorLitro: number;
        totalKm: number;
        totalLitros: number;
    };
    gnv: {
        kmPorLitro: number;
        totalKm: number;
        totalLitros: number;
    };

    // Paridade Flex (Etanol vs Gasolina)
    paridadeFlex: {
        ratioPercent: number; // Ex: 71.4%
        isCalculated: boolean;
        recomendacao: string;
    };

    // Último Abastecimento
    ultimoAbastecimento: {
        kmPorLitro: number;
        fuelType: FuelType;
        liters: number;
        dist: number;
        date: string;
        isResetOrGap: boolean;
    } | null;

    // Segmentos detalhados
    segments: FuelSegmentCalculation[];
}

/**
 * Processa a lista de transações de combustível ordenadas pelo odômetro (mileage ASC)
 * e calcula médias gerais e específicas por tipo de combustível (Gasolina, Etanol, etc.),
 * tratando automaticamente saltos de odômetro (ex: 2000 km) ou tags manuais de reset.
 */
export function calculateFuelMetrics(sortedFuelTransactions: any[]): FuelStats {
    let minMileage = Infinity;
    let maxMileage = -Infinity;
    let totalCombustivelGasto = 0;

    sortedFuelTransactions.forEach(t => {
        totalCombustivelGasto += (t.amount || 0);
        if (t.mileage && t.mileage > 0) {
            if (t.mileage < minMileage) minMileage = t.mileage;
            if (t.mileage > maxMileage) maxMileage = t.mileage;
        }
    });

    const totalKmRodados = (minMileage !== Infinity && maxMileage !== -Infinity && maxMileage > minMileage)
        ? (maxMileage - minMileage)
        : 0;

    let validGlobalDistance = 0;
    let validGlobalLiters = 0;

    // Acumuladores específicos
    const fuelAccumulators: Record<FuelType, { dist: number; liters: number; gasto: number; count: number }> = {
        gasolina: { dist: 0, liters: 0, gasto: 0, count: 0 },
        etanol: { dist: 0, liters: 0, gasto: 0, count: 0 },
        diesel: { dist: 0, liters: 0, gasto: 0, count: 0 },
        gnv: { dist: 0, liters: 0, gasto: 0, count: 0 },
    };

    // Contabiliza gastos brutos por tipo de combustível
    sortedFuelTransactions.forEach(t => {
        const ft = detectFuelType(t.description);
        fuelAccumulators[ft].gasto += (t.amount || 0);
        fuelAccumulators[ft].count += 1;
    });

    const segments: FuelSegmentCalculation[] = [];
    let lastValidRefuelingAvg: FuelStats['ultimoAbastecimento'] = null;

    for (let i = 1; i < sortedFuelTransactions.length; i++) {
        const current = sortedFuelTransactions[i];
        const prev = sortedFuelTransactions[i - 1];

        const rawDist = (current.mileage || 0) - (prev.mileage || 0);
        const liters = current.liters || 0;
        const currentFuel = detectFuelType(current.description);
        const prevFuel = detectFuelType(prev.description);

        const manualReset = hasResetCycleTag(current.description);
        const isExcessiveDistance = rawDist > MAX_PLAUSIBLE_TANK_KM; // Ex: 2000 km sem anotação intermediária
        const tempKml = (rawDist > 0 && liters > 0) ? (rawDist / liters) : 0;
        const isUnrealKml = tempKml > MAX_PLAUSIBLE_KML || (rawDist > 0 && liters > 0 && tempKml < MIN_PLAUSIBLE_KML);

        const isGap = manualReset || isExcessiveDistance || isUnrealKml;

        let gapReason: string | undefined = undefined;
        if (manualReset) {
            gapReason = 'Início de novo ciclo (marcado manualmente)';
        } else if (isExcessiveDistance) {
            gapReason = `Salto de ${rawDist.toLocaleString('pt-BR')} km detectado (abastecimentos intermediários esquecidos - ciclo reiniciado)`;
        } else if (isUnrealKml && tempKml > MAX_PLAUSIBLE_KML) {
            gapReason = `Média irreal (${tempKml.toFixed(1)} km/l) detectada devido a salto no odômetro`;
        } else if (isUnrealKml && tempKml < MIN_PLAUSIBLE_KML) {
            gapReason = `Média anormalmente baixa (${tempKml.toFixed(1)} km/l) desconsiderada`;
        }

        const segment: FuelSegmentCalculation = {
            transactionId: current.id,
            fuelType: currentFuel,
            dist: rawDist,
            liters: liters,
            kmPerLiter: !isGap && liters > 0 ? tempKml : 0,
            isReset: manualReset,
            isGapOutlier: isGap,
            gapReason,
            amount: current.amount || 0,
            date: current.date
        };

        segments.push(segment);

        // Se NÃO for salto/reset e os dados forem consistentes, soma às métricas
        if (!isGap && rawDist > 0 && liters > 0) {
            validGlobalDistance += rawDist;
            validGlobalLiters += liters;

            // Atribuição de combustível para médias individuais:
            // O trecho rodado (rawDist) foi consumido com o combustível que estava no tanque (prevFuel).
            // Se prev e current usam o mesmo combustível (ex: Gasolina -> Gasolina), a média é 100% pura daquele tipo.
            // Se mudou de combustível (ex: Etanol -> Gasolina), o trecho rodado foi queimado no combustível anterior (prevFuel).
            const fuelBurned = (prevFuel === currentFuel) ? currentFuel : prevFuel;

            if (fuelAccumulators[fuelBurned]) {
                fuelAccumulators[fuelBurned].dist += rawDist;
                fuelAccumulators[fuelBurned].liters += liters;
            }

            // Atualiza último abastecimento válido
            lastValidRefuelingAvg = {
                kmPorLitro: tempKml,
                fuelType: currentFuel,
                liters: liters,
                dist: rawDist,
                date: current.date,
                isResetOrGap: false
            };
        } else if (isGap && i === sortedFuelTransactions.length - 1) {
            // Se o último abastecimento foi um reset
            lastValidRefuelingAvg = {
                kmPorLitro: 0,
                fuelType: currentFuel,
                liters: liters,
                dist: rawDist,
                date: current.date,
                isResetOrGap: true
            };
        }
    }

    const mediaGeralKmPorLitro = (validGlobalDistance > 0 && validGlobalLiters > 0)
        ? (validGlobalDistance / validGlobalLiters)
        : 0;

    const custoMedioPorKm = (totalKmRodados > 0)
        ? (totalCombustivelGasto / totalKmRodados)
        : 0;

    // Métricas por tipo de combustível
    const calcFuelMetrics = (ft: FuelType) => {
        const acc = fuelAccumulators[ft];
        const kml = (acc.dist > 0 && acc.liters > 0) ? (acc.dist / acc.liters) : 0;
        const cpk = (acc.dist > 0) ? (acc.gasto / acc.dist) : 0;
        return {
            kmPorLitro: kml,
            totalKm: acc.dist,
            totalLitros: acc.liters,
            totalGasto: acc.gasto,
            custoPorKm: cpk,
            abastecimentosCount: acc.count
        };
    };

    const gasolina = calcFuelMetrics('gasolina');
    const etanol = calcFuelMetrics('etanol');
    const diesel = calcFuelMetrics('diesel');
    const gnv = calcFuelMetrics('gnv');

    // Paridade Flex
    let ratioPercent = 0;
    let isCalculated = false;
    let recomendacao = 'Insira abastecimentos de Gasolina e Etanol para calcular a paridade exata do seu motor.';

    if (gasolina.kmPorLitro > 0 && etanol.kmPorLitro > 0) {
        ratioPercent = (etanol.kmPorLitro / gasolina.kmPorLitro) * 100;
        isCalculated = true;
        recomendacao = `Seu carro rende ${ratioPercent.toFixed(0)}% no Etanol comparado à Gasolina. O Etanol compensa se o preço dele na bomba custar até ${ratioPercent.toFixed(0)}% do preço da Gasolina.`;
    } else if (gasolina.kmPorLitro > 0) {
        recomendacao = `Média na Gasolina: ${gasolina.kmPorLitro.toFixed(1)} km/l. Abasteça com Etanol para comparar a paridade real.`;
    } else if (etanol.kmPorLitro > 0) {
        recomendacao = `Média no Etanol: ${etanol.kmPorLitro.toFixed(1)} km/l. Abasteça com Gasolina para comparar a paridade real.`;
    }

    return {
        totalKmRodados,
        totalCombustivelGasto,
        custoMedioPorKm,
        mediaGeralKmPorLitro,
        gasolina,
        etanol,
        diesel,
        gnv,
        paridadeFlex: {
            ratioPercent,
            isCalculated,
            recomendacao
        },
        ultimoAbastecimento: lastValidRefuelingAvg,
        segments
    };
}
