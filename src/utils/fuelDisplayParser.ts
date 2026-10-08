// Interpreta os visores de 7 segmentos lidos nas duas fotos do abastecimento.
// Bomba: procura os 3 visores em que litros × preço ≈ total (isso confirma a leitura e
// descobre o ponto decimal, que muitas vezes some). Painel: o número compatível com o
// último KM registrado.
import type { DisplayReading } from './sevenSegment';

export interface ParsedFuelReading {
    odometro_km: number | null;
    litros: number | null;
    valor_total: number | null;
    preco_litro: number | null;
    observacoes: string;
}

const MIN_CONFIDENCE = 0.35;

const RANGES = {
    total: [3, 3000],
    litros: [0.3, 250],
    preco: [1.5, 15],
} as const;

interface Candidate {
    value: number;
    explicit: boolean; // ponto decimal lido de fato no visor
}

function cleanDisplays(displays: DisplayReading[]): DisplayReading[] {
    return displays.filter(d => d.confidence >= MIN_CONFIDENCE && !d.text.includes('?') && d.text.replace(/\D/g, '').length >= 2);
}

function candidates(text: string): Candidate[] {
    const digits = text.replace(/\D/g, '');
    if (digits.length < 2 || digits.length > 7) return [];
    const list: Candidate[] = [];
    const dot = text.lastIndexOf('.');
    if (dot > 0) list.push({ value: parseFloat(`${text.slice(0, dot).replace(/\D/g, '')}.${text.slice(dot + 1).replace(/\D/g, '')}`), explicit: true });
    for (const decimals of [0, 1, 2, 3]) list.push({ value: parseInt(digits, 10) / 10 ** decimals, explicit: false });
    return list;
}

const inRange = (v: number, [min, max]: readonly [number, number]) => v >= min && v <= max;

interface PumpResult {
    total: number | null;
    litros: number | null;
    preco: number | null;
    validated: boolean;
}

export function parsePumpDisplays(raw: DisplayReading[]): PumpResult {
    const displays = cleanDisplays(raw).sort((a, b) => a.box.y - b.box.y);
    let best: { score: number; t: number; l: number; p: number } | null = null;

    // Testa todas as combinações de 3 visores distintos nos papéis total / litros / preço
    displays.forEach((dt, it) => displays.forEach((dl, il) => displays.forEach((dp, ip) => {
        if (it === il || it === ip || il === ip) return;
        for (const t of candidates(dt.text)) {
            if (!inRange(t.value, RANGES.total)) continue;
            for (const l of candidates(dl.text)) {
                if (!inRange(l.value, RANGES.litros)) continue;
                for (const p of candidates(dp.text)) {
                    if (!inRange(p.value, RANGES.preco)) continue;
                    const err = Math.abs(l.value * p.value - t.value);
                    if (err > Math.max(0.06, t.value * 0.006)) continue;

                    // Ordem padrão das bombas: total em cima, litros no meio, preço embaixo
                    const orderPenalty = it < il && il < ip ? 0 : 0.6;
                    const explicitBonus = [t, l, p].filter(c => c.explicit).length * 0.1;
                    const confidence = (dt.confidence + dl.confidence + dp.confidence) / 3;
                    const score = (err / t.value) * 50 + orderPenalty - explicitBonus - confidence;
                    if (!best || score < best.score) best = { score, t: t.value, l: l.value, p: p.value };
                }
            }
        }
    })));

    if (best) {
        const b = best as { t: number; l: number; p: number };
        return { total: +b.t.toFixed(2), litros: +b.l.toFixed(3), preco: +b.p.toFixed(3), validated: true };
    }

    // Sem combinação que feche a conta: só arrisca se a foto tiver o layout de bomba
    // (3 visores empilhados); usa a ordem de cima para baixo e as casas decimais típicas
    if (displays.length < 3) return { total: null, litros: null, preco: null, validated: false };
    const pick =(d: DisplayReading | undefined, decimals: number, range: readonly [number, number]) => {
        if (!d) return null;
        const explicit = candidates(d.text).find(c => c.explicit && inRange(c.value, range));
        if (explicit) return explicit.value;
        const typical = parseInt(d.text.replace(/\D/g, ''), 10) / 10 ** decimals;
        return inRange(typical, range) ? typical : null;
    };
    const [top, middle, bottom] = displays;
    const result: PumpResult = {
        total: pick(top, 2, RANGES.total),
        litros: pick(middle, 3, RANGES.litros),
        preco: pick(bottom, 3, RANGES.preco),
        validated: false,
    };
    if (result.litros == null && result.total != null && result.preco) result.litros = +(result.total / result.preco).toFixed(3);
    if (result.total == null && result.litros != null && result.preco != null) result.total = +(result.litros * result.preco).toFixed(2);
    return result;
}

// Odômetro: número inteiro de 3 a 7 dígitos. Com KM anterior conhecido, escolhe o
// valor plausível (até 5.000 km acima do último); sem histórico, o maior número lido.
export function parseOdometerDisplays(raw: DisplayReading[], lastMileage: number): number | null {
    const values = cleanDisplays(raw)
        .map(d => ({ value: parseInt(d.text.split('.')[0].replace(/\D/g, ''), 10), digits: d.text.split('.')[0].replace(/\D/g, '').length, confidence: d.confidence }))
        .filter(v => v.digits >= 3 && v.digits <= 7 && !isNaN(v.value));
    if (values.length === 0) return null;

    if (lastMileage > 0) {
        const plausible = values.filter(v => v.value >= lastMileage && v.value <= lastMileage + 5000).sort((a, b) => a.value - b.value);
        if (plausible.length > 0) return plausible[0].value;
    }
    // O odômetro nunca volta: valores abaixo do último registro são leitura errada
    const valid = values.filter(v => lastMileage <= 0 || v.value >= lastMileage);
    if (valid.length === 0) return null;
    valid.sort((a, b) => b.digits - a.digits || b.confidence - a.confidence);
    return valid[0].value;
}

export function parseFuelDisplays(pump: DisplayReading[], dash: DisplayReading[], lastMileage = 0): ParsedFuelReading {
    const notes: string[] = [];

    let pumpResult = parsePumpDisplays(pump);
    let odometerSource = dash;
    if (!pumpResult.validated) {
        // Fotos escolhidas na ordem invertida? Se a conta fecha na outra foto, troca os papéis.
        const swapped = parsePumpDisplays(dash);
        if (swapped.validated) {
            pumpResult = swapped;
            odometerSource = pump;
            notes.push('as fotos estavam na ordem invertida, já corrigi');
        }
    }
    const odometro_km = parseOdometerDisplays(odometerSource, lastMileage);

    if (pumpResult.total != null && !pumpResult.validated) notes.push('não consegui confirmar litros × preço = total');
    if (odometro_km != null && lastMileage > 0 && (odometro_km < lastMileage || odometro_km > lastMileage + 5000)) {
        notes.push('KM fora do esperado pelo histórico');
    }

    return {
        odometro_km,
        litros: pumpResult.litros,
        valor_total: pumpResult.total,
        preco_litro: pumpResult.preco,
        observacoes: notes.join('; '),
    };
}
