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
    return displays.filter(d => d.confidence >= 0.25 && d.text.replace(/\D/g, '').length >= 2);
}

function candidates(text: string): Candidate[] {
    const list: Candidate[] = [];
    const qCount = (text.match(/\?/g) || []).length;

    // Se tiver '?', gera variações substituindo por 0..9 quando for 1 dígito ruidoso
    const variations: string[] = [];
    if (qCount === 1) {
        for (let d = 0; d <= 9; d++) {
            variations.push(text.replace('?', String(d)));
        }
    } else if (qCount === 0) {
        variations.push(text);
    }

    for (const vText of variations) {
        const digits = vText.replace(/\D/g, '');
        if (digits.length < 2 || digits.length > 7) continue;
        const dot = vText.lastIndexOf('.');
        if (dot > 0) {
            const val = parseFloat(`${vText.slice(0, dot).replace(/\D/g, '')}.${vText.slice(dot + 1).replace(/\D/g, '')}`);
            if (!isNaN(val)) list.push({ value: val, explicit: true });
        }
        for (const decimals of [0, 1, 2, 3]) {
            const val = parseInt(digits, 10) / 10 ** decimals;
            if (!isNaN(val)) list.push({ value: val, explicit: false });
        }
    }
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

    // 1. Testa todas as combinações de 3 visores distintos nos papéis total / litros / preço
    displays.forEach((dt, it) => displays.forEach((dl, il) => displays.forEach((dp, ip) => {
        if (it === il || it === ip || il === ip) return;
        for (const t of candidates(dt.text)) {
            if (!inRange(t.value, RANGES.total)) continue;
            for (const l of candidates(dl.text)) {
                if (!inRange(l.value, RANGES.litros)) continue;
                for (const p of candidates(dp.text)) {
                    if (!inRange(p.value, RANGES.preco)) continue;
                    const err = Math.abs(l.value * p.value - t.value);
                    if (err > Math.max(0.06, t.value * 0.008)) continue;

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

    // 2. Se não achou o trio completo, testa pares (2 visores identificados matematicamente determinam o terceiro!)
    displays.forEach((d1, i1) => displays.forEach((d2, i2) => {
        if (i1 === i2) return;
        // Par (Total, Litros) -> calcula Preço
        for (const t of candidates(d1.text)) {
            if (!inRange(t.value, RANGES.total)) continue;
            for (const l of candidates(d2.text)) {
                if (!inRange(l.value, RANGES.litros)) continue;
                const calcP = +(t.value / l.value).toFixed(3);
                if (inRange(calcP, RANGES.preco)) {
                    const score = (i1 < i2 ? 0 : 0.5) - (d1.confidence + d2.confidence) / 2;
                    if (!best || score < best.score) best = { score, t: t.value, l: l.value, p: calcP };
                }
            }
        }
        // Par (Total, Preço) -> calcula Litros
        for (const t of candidates(d1.text)) {
            if (!inRange(t.value, RANGES.total)) continue;
            for (const p of candidates(d2.text)) {
                if (!inRange(p.value, RANGES.preco)) continue;
                const calcL = +(t.value / p.value).toFixed(3);
                if (inRange(calcL, RANGES.litros)) {
                    const score = (i1 < i2 ? 0 : 0.5) - (d1.confidence + d2.confidence) / 2;
                    if (!best || score < best.score) best = { score, t: t.value, l: calcL, p: p.value };
                }
            }
        }
        // Par (Litros, Preço) -> calcula Total
        for (const l of candidates(d1.text)) {
            if (!inRange(l.value, RANGES.litros)) continue;
            for (const p of candidates(d2.text)) {
                if (!inRange(p.value, RANGES.preco)) continue;
                const calcT = +(l.value * p.value).toFixed(2);
                if (inRange(calcT, RANGES.total)) {
                    const score = (i1 < i2 ? 0 : 0.5) - (d1.confidence + d2.confidence) / 2;
                    if (!best || score < best.score) best = { score, t: calcT, l: l.value, p: p.value };
                }
            }
        }
    }));

    if (best) {
        const b = best as { t: number; l: number; p: number };
        return { total: +b.t.toFixed(2), litros: +b.l.toFixed(3), preco: +b.p.toFixed(3), validated: true };
    }

    // 3. Sem combinação matemática: tenta usar os visores detectados individualmente
    if (displays.length === 0) return { total: null, litros: null, preco: null, validated: false };

    const pick = (d: DisplayReading | undefined, decimals: number, range: readonly [number, number]) => {
        if (!d) return null;
        const explicit = candidates(d.text).find(c => c.explicit && inRange(c.value, range));
        if (explicit) return explicit.value;
        const typical = parseInt(d.text.replace(/\D/g, ''), 10) / 10 ** decimals;
        return inRange(typical, range) ? typical : null;
    };

    if (displays.length >= 3) {
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

    // Se temos 1 ou 2 visores sem validação exata, aproveita o que foi lido
    let fallbackTotal: number | null = null;
    let fallbackLitros: number | null = null;
    let fallbackPreco: number | null = null;

    for (const d of displays) {
        const cand = candidates(d.text);
        const tVal = cand.find(c => inRange(c.value, RANGES.total));
        const lVal = cand.find(c => inRange(c.value, RANGES.litros));
        const pVal = cand.find(c => inRange(c.value, RANGES.preco));
        if (fallbackTotal == null && tVal) fallbackTotal = tVal.value;
        else if (fallbackLitros == null && lVal) fallbackLitros = lVal.value;
        else if (fallbackPreco == null && pVal) fallbackPreco = pVal.value;
    }

    if (fallbackLitros == null && fallbackTotal != null && fallbackPreco != null) {
        fallbackLitros = +(fallbackTotal / fallbackPreco).toFixed(3);
    }
    if (fallbackTotal == null && fallbackLitros != null && fallbackPreco != null) {
        fallbackTotal = +(fallbackLitros * fallbackPreco).toFixed(2);
    }

    return { total: fallbackTotal, litros: fallbackLitros, preco: fallbackPreco, validated: false };
}

// Odômetro: número inteiro de 3 a 7 dígitos. Com KM anterior conhecido, escolhe o
// valor plausível (até 10.000 km acima do último); sem histórico, o maior número lido.
export function parseOdometerDisplays(raw: DisplayReading[], lastMileage: number): number | null {
    const values = cleanDisplays(raw)
        .map(d => ({ value: parseInt(d.text.split('.')[0].replace(/\D/g, ''), 10), digits: d.text.split('.')[0].replace(/\D/g, '').length, confidence: d.confidence }))
        .filter(v => v.digits >= 3 && v.digits <= 7 && !isNaN(v.value));
    if (values.length === 0) return null;

    if (lastMileage > 0) {
        const plausible = values.filter(v => v.value >= lastMileage && v.value <= lastMileage + 10000).sort((a, b) => a.value - b.value);
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

    // Se a foto da bomba não deu resultado, mas a foto do painel tinha visores de bomba (fotos invertidas)
    if (!pumpResult.validated && pumpResult.total == null && dash.length > 0) {
        const swapped = parsePumpDisplays(dash);
        if (swapped.validated || swapped.total != null) {
            pumpResult = swapped;
            odometerSource = pump;
            notes.push('as fotos estavam na ordem invertida, já corrigi');
        }
    }

    const odometro_km = parseOdometerDisplays(odometerSource, lastMileage);

    if (pumpResult.total != null && !pumpResult.validated) notes.push('não consegui confirmar litros × preço = total');
    if (odometro_km != null && lastMileage > 0 && (odometro_km < lastMileage || odometro_km > lastMileage + 10000)) {
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
