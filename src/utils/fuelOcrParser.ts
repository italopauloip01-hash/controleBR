// Interpreta o texto lido (OCR) das fotos da bomba e do painel.
// O leitor só devolve texto solto, então os números são identificados por regras:
// na bomba, procura o trio em que litros × preço ≈ total; no painel, o maior número
// compatível com o último KM registrado.
import type { FuelType } from './fuelUtils';

export interface OcrLine {
    text: string;
    left?: number;
    top?: number;
    right?: number;
    bottom?: number;
}

export interface OcrPhoto {
    lines: OcrLine[];
    width: number;
    height: number;
}

export interface ParsedFuelReading {
    odometro_km: number | null;
    litros: number | null;
    valor_total: number | null;
    preco_litro: number | null;
    combustivel: FuelType | null;
    observacoes: string;
}

interface Token {
    raw: string;
    candidates: number[];
    hasSeparator: boolean;
    cx: number; // centro normalizado (0-1)
    cy: number;
}

const PUMP_KEYWORDS = ['LITRO', 'TOTAL', 'PAGAR', 'PRECO', 'GASOLINA', 'ETANOL', 'ALCOOL', 'DIESEL', 'GNV', 'ANP', 'BOMBA', 'COMBUSTIVE'];

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

// Displays de 7 segmentos costumam ser lidos com letras no lugar de dígitos (O→0, I→1, S→5...)
const LOOKALIKES: Record<string, string> = { O: '0', o: '0', D: '0', Q: '0', I: '1', l: '1', '|': '1', i: '1', Z: '2', S: '5', s: '5', B: '8', G: '6', b: '6' };

function fixDigitLookalikes(text: string): string {
    const chars = text.split('');
    const isDigitish = (c?: string) => !!c && /[\d.,]/.test(c);
    return chars.map((c, i) => (LOOKALIKES[c] && (isDigitish(chars[i - 1]) || isDigitish(chars[i + 1])) ? LOOKALIKES[c] : c)).join('');
}

function lineCenter(line: OcrLine, photo: OcrPhoto) {
    if (line.left == null || line.right == null || line.top == null || line.bottom == null || !photo.width || !photo.height) {
        return { cx: 0.5, cy: 0.5 };
    }
    return { cx: (line.left + line.right) / 2 / photo.width, cy: (line.top + line.bottom) / 2 / photo.height };
}

export function isPumpPhoto(photo: OcrPhoto): boolean {
    const text = normalize(photo.lines.map(l => l.text).join(' '));
    return PUMP_KEYWORDS.filter(k => text.includes(k)).length >= 2;
}

// Números da bomba: aceita separador decimal lido (vírgula, ponto ou espaço) e também
// tenta as casas decimais "sumidas" (o ponto do display muitas vezes não é lido).
function pumpTokens(photo: OcrPhoto): Token[] {
    const tokens: Token[] = [];
    for (const line of photo.lines) {
        const text = fixDigitLookalikes(line.text);
        const { cx, cy } = lineCenter(line, photo);
        // Também considera "150 00" (ponto do display lido como espaço) como um número só
        const raws = [
            ...[...text.matchAll(/\d+(?:[.,]\d+)*/g)].map(m => m[0]),
            ...[...text.matchAll(/(?<![\d.,])\d{1,4} \d{2,3}(?![\d.,])/g)].map(m => m[0]),
        ];
        for (const raw of raws) {
            const digits = raw.replace(/\D/g, '');
            if (digits.length < 2 || digits.length > 7) continue;

            const candidates = new Set<number>();
            const sepMatch = raw.match(/^(.*\d)[.,\s](\d+)$/);
            if (sepMatch) {
                const intPart = sepMatch[1].replace(/\D/g, '');
                candidates.add(parseFloat(`${intPart}.${sepMatch[2]}`));
            }
            for (const decimals of [0, 2, 3]) {
                candidates.add(parseInt(digits, 10) / 10 ** decimals);
            }
            tokens.push({ raw, candidates: [...candidates], hasSeparator: !!sepMatch, cx, cy });
        }
    }
    return tokens;
}

function labelPosition(photo: OcrPhoto, keywords: string[]) {
    const line = photo.lines.find(l => keywords.some(k => normalize(l.text).includes(k)));
    return line ? lineCenter(line, photo) : null;
}

// Distância de um número até o rótulo impresso logo abaixo dele (o display fica acima do rótulo)
function labelDistance(token: Token, label: { cx: number; cy: number } | null): number {
    if (!label) return 0.3;
    const dy = label.cy - token.cy;
    const verticalPenalty = dy < -0.02 ? 0.5 : 0; // número abaixo do rótulo: improvável
    return Math.abs(dy) + Math.abs(label.cx - token.cx) * 0.5 + verticalPenalty;
}

interface PumpReading {
    litros: number | null;
    valor_total: number | null;
    preco_litro: number | null;
    validated: boolean;
}

function parsePump(photos: OcrPhoto[]): PumpReading {
    let best: { score: number; t: number; l: number; p: number } | null = null;
    const fallback: PumpReading = { litros: null, valor_total: null, preco_litro: null, validated: false };

    for (const photo of photos) {
        const tokens = pumpTokens(photo);
        const totalLabel = labelPosition(photo, ['TOTAL', 'PAGAR']);
        const litersLabel = labelPosition(photo, ['LITROS']);
        const priceLabel = labelPosition(photo, ['PRECO', 'POR LITRO']);

        const expand = (min: number, max: number, label: { cx: number; cy: number } | null) =>
            tokens.flatMap(tok => tok.candidates
                .filter(v => v >= min && v <= max)
                .map(v => ({ v, tok, dist: labelDistance(tok, label) })));

        const totals = expand(3, 3000, totalLabel);
        const liters = expand(0.3, 250, litersLabel);
        const prices = expand(1.5, 15, priceLabel);

        for (const t of totals) {
            for (const l of liters) {
                if (l.tok === t.tok) continue;
                for (const p of prices) {
                    if (p.tok === t.tok || p.tok === l.tok) continue;
                    const err = Math.abs(l.v * p.v - t.v);
                    if (err > Math.max(0.06, t.v * 0.006)) continue;
                    const score = err / t.v * 50 + t.dist + l.dist + p.dist
                        - (t.tok.hasSeparator ? 0.05 : 0) - (l.tok.hasSeparator ? 0.05 : 0) - (p.tok.hasSeparator ? 0.05 : 0);
                    if (!best || score < best.score) best = { score, t: t.v, l: l.v, p: p.v };
                }
            }
        }

        // Sem trio consistente: usa o número mais perto de cada rótulo, nas casas decimais típicas
        if (!best) {
            const nearest = (label: { cx: number; cy: number } | null, min: number, max: number, decimals: number) => {
                if (!label) return null;
                const options = tokens
                    .map(tok => ({ tok, v: tok.candidates.find(c => c >= min && c <= max && (tok.hasSeparator || Number((c * 10 ** decimals).toFixed(0)) === parseInt(tok.raw.replace(/\D/g, ''), 10))) }))
                    .filter((o): o is { tok: Token; v: number } => o.v != null)
                    .sort((a, b) => labelDistance(a.tok, label) - labelDistance(b.tok, label));
                return options[0]?.v ?? null;
            };
            fallback.valor_total ??= nearest(totalLabel, 3, 3000, 2);
            fallback.litros ??= nearest(litersLabel, 0.3, 250, 3);
            fallback.preco_litro ??= nearest(priceLabel, 1.5, 15, 3);
        }
    }

    if (best) {
        return { valor_total: +best.t.toFixed(2), litros: +best.l.toFixed(3), preco_litro: +best.p.toFixed(3), validated: true };
    }

    const { litros, valor_total, preco_litro } = fallback;
    if (litros == null && valor_total != null && preco_litro) fallback.litros = +(valor_total / preco_litro).toFixed(3);
    if (valor_total == null && litros != null && preco_litro != null) fallback.valor_total = +(litros * preco_litro).toFixed(2);
    return fallback;
}

// Odômetro: números inteiros de 3 a 7 dígitos (aceita separador de milhar "132.031").
// Com KM anterior conhecido, escolhe o valor plausível mais próximo acima dele.
function parseOdometer(photos: OcrPhoto[], lastMileage: number): number | null {
    const values: number[] = [];
    for (const photo of photos) {
        for (const line of photo.lines) {
            const text = fixDigitLookalikes(line.text);
            if (/TRIP/i.test(text)) continue;
            for (const match of text.matchAll(/\d{1,3}(?:[.,]\d{3})+|\d+/g)) {
                const digits = match[0].replace(/\D/g, '');
                if (digits.length >= 3 && digits.length <= 7) values.push(parseInt(digits, 10));
            }
        }
    }
    if (values.length === 0) return null;

    if (lastMileage > 0) {
        const plausible = values.filter(v => v >= lastMileage && v <= lastMileage + 5000).sort((a, b) => a - b);
        if (plausible.length > 0) return plausible[0];
    }
    // Sem histórico: o hodômetro total costuma ser o maior número do painel
    const large = values.filter(v => v >= 1000);
    return large.length > 0 ? Math.max(...large) : null;
}

function parseFuelType(photos: OcrPhoto[]): FuelType | null {
    const text = normalize(photos.flatMap(p => p.lines.map(l => l.text)).join(' '));
    if (text.includes('ETANOL') || text.includes('ALCOOL')) return 'etanol';
    if (text.includes('DIESEL')) return 'diesel';
    if (text.includes('GNV')) return 'gnv';
    if (text.includes('GASOLINA')) return 'gasolina';
    return null;
}

export function parseFuelPhotos(photos: OcrPhoto[], lastMileage = 0): ParsedFuelReading {
    const pumpPhotos = photos.filter(isPumpPhoto);
    const dashPhotos = photos.filter(p => !isPumpPhoto(p));

    const pump = parsePump(pumpPhotos.length > 0 ? pumpPhotos : photos);
    const odometro_km = parseOdometer(dashPhotos.length > 0 ? dashPhotos : photos, lastMileage);

    const notes: string[] = [];
    if (pump.valor_total != null && !pump.validated) notes.push('não consegui confirmar litros × preço = total');

    return {
        odometro_km,
        litros: pump.litros,
        valor_total: pump.valor_total,
        preco_litro: pump.preco_litro,
        combustivel: parseFuelType(pumpPhotos.length > 0 ? pumpPhotos : photos),
        observacoes: notes.join('; '),
    };
}
