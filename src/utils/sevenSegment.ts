// Leitor de visores de 7 segmentos (bomba de combustível e odômetro digital).
// Leitores de texto comuns (OCR) não entendem esses dígitos, então a leitura é feita
// por geometria: acha os retângulos coloridos dos visores, separa os dígitos e
// verifica quais dos 7 segmentos estão acesos. Roda 100% no aparelho, sem internet.

export interface DisplayBox {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface DisplayReading {
    text: string; // ex.: "150.00" (pode conter "?" em dígitos não reconhecidos)
    box: DisplayBox; // em coordenadas da imagem analisada
    confidence: number; // 0-1, média dos dígitos
}

// Segmentos na ordem a b c d e f g
const DIGIT_PATTERNS: [string, number[]][] = [
    ['0', [1, 1, 1, 1, 1, 1, 0]],
    ['1', [0, 1, 1, 0, 0, 0, 0]],
    ['2', [1, 1, 0, 1, 1, 0, 1]],
    ['3', [1, 1, 1, 1, 0, 0, 1]],
    ['4', [0, 1, 1, 0, 0, 1, 1]],
    ['5', [1, 0, 1, 1, 0, 1, 1]],
    ['6', [1, 0, 1, 1, 1, 1, 1]],
    ['6', [0, 0, 1, 1, 1, 1, 1]],
    ['7', [1, 1, 1, 0, 0, 0, 0]],
    ['7', [1, 1, 1, 0, 0, 1, 0]],
    ['8', [1, 1, 1, 1, 1, 1, 1]],
    ['9', [1, 1, 1, 1, 0, 1, 1]],
    ['9', [1, 1, 1, 0, 0, 1, 1]],
];

// Regiões (frações da caixa do dígito) onde fica cada segmento: [x0, x1, y0, y1]
// Verticais ficam nas bordas e longe dos cantos, para não pegar a ponta dos horizontais.
const SEGMENT_REGIONS: [number, number, number, number][] = [
    [0.3, 0.7, 0.0, 0.17], // a - topo
    [0.68, 1.0, 0.2, 0.4], // b - direita superior
    [0.68, 1.0, 0.6, 0.8], // c - direita inferior
    [0.3, 0.7, 0.83, 1.0], // d - base
    [0.0, 0.32, 0.6, 0.8], // e - esquerda inferior
    [0.0, 0.32, 0.2, 0.4], // f - esquerda superior
    [0.3, 0.7, 0.4, 0.6], // g - meio
];

const MAX_WORK_SIDE = 1100;

/** Redimensiona para um tamanho de trabalho e devolve os pixels. */
export function imageDataFromCanvas(source: HTMLCanvasElement): ImageData {
    const scale = Math.min(1, MAX_WORK_SIDE / Math.max(source.width, source.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(source.width * scale);
    canvas.height = Math.round(source.height * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function luminanceMap(img: ImageData): Float32Array {
    const { data, width, height } = img;
    const lum = new Float32Array(width * height);
    for (let i = 0, p = 0; p < lum.length; i += 4, p++) {
        lum[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    return lum;
}

// Fundo iluminado e colorido do visor (laranja, vermelho, verde, azul...).
// No modo tolerante aceita fundos mais apagados (visor sem luz, foto de dia).
function backlitMask(img: ImageData, tolerant: boolean): Uint8Array {
    const { data, width, height } = img;
    const minBright = tolerant ? 90 : 120, minSat = tolerant ? 0.15 : 0.3;
    const mask = new Uint8Array(width * height);
    for (let i = 0, p = 0; p < mask.length; i += 4, p++) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        if (max > minBright && (max - min) / max > minSat) mask[p] = 1;
    }
    return mask;
}

// Fecha pequenos buracos (dígitos escuros) para o visor virar um bloco só
function dilate(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
    const tmp = new Uint8Array(mask.length);
    const out = new Uint8Array(mask.length);
    for (let y = 0; y < height; y++) {
        let run = 0;
        for (let x = 0; x < width + radius; x++) {
            if (x < width && mask[y * width + x]) run = radius * 2 + 1;
            if (run > 0) {
                const tx = x - radius;
                if (tx >= 0 && tx < width) tmp[y * width + tx] = 1;
                run--;
            }
        }
        // varredura reversa para cobrir o lado esquerdo
        run = 0;
        for (let x = width - 1; x >= -radius; x--) {
            if (x >= 0 && mask[y * width + x]) run = radius + 1;
            if (run > 0 && x >= 0) tmp[y * width + x] = 1;
            if (run > 0) run--;
        }
    }
    for (let x = 0; x < width; x++) {
        let run = 0;
        for (let y = 0; y < height; y++) {
            if (tmp[y * width + x]) run = radius + 1;
            if (run > 0) { out[y * width + x] = 1; run--; }
        }
        run = 0;
        for (let y = height - 1; y >= 0; y--) {
            if (tmp[y * width + x]) run = radius + 1;
            if (run > 0) { out[y * width + x] = 1; run--; }
        }
    }
    return out;
}

function connectedBoxes(mask: Uint8Array, width: number, height: number): (DisplayBox & { count: number })[] {
    const seen = new Uint8Array(mask.length);
    const boxes: (DisplayBox & { count: number })[] = [];
    const stack: number[] = [];
    for (let start = 0; start < mask.length; start++) {
        if (!mask[start] || seen[start]) continue;
        let minX = width, minY = height, maxX = 0, maxY = 0, count = 0;
        stack.push(start);
        seen[start] = 1;
        while (stack.length) {
            const p = stack.pop()!;
            const x = p % width, y = (p - x) / width;
            count++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            const neighbors = [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, y > 0 ? p - width : -1, y < height - 1 ? p + width : -1];
            for (const n of neighbors) {
                if (n >= 0 && mask[n] && !seen[n]) { seen[n] = 1; stack.push(n); }
            }
        }
        boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, count });
    }
    return boxes;
}

function findDisplayBoxes(img: ImageData, tolerant: boolean): DisplayBox[] {
    const { width, height } = img;
    const raw = backlitMask(img, tolerant);
    const radius = Math.max(1, Math.round(Math.min(width, height) / 300));
    const mask = dilate(raw, width, height, radius);
    const minSide = Math.min(width, height);

    return connectedBoxes(mask, width, height)
        .filter(b => {
            const aspect = b.w / b.h;
            const fill = b.count / (b.w * b.h);
            return b.w >= minSide * 0.06 && b.h >= minSide * 0.025 && aspect >= 1.3 && aspect <= 12 && fill >= 0.55;
        })
        .map(({ x, y, w, h }) => ({ x, y, w, h }));
}

interface InkGrid {
    ink: Uint8Array;
    w: number;
    h: number;
}

// Segmentos escuros sobre o fundo iluminado do visor
function inkInside(img: ImageData, lum: Float32Array, box: DisplayBox): InkGrid | null {
    const marginX = Math.round(box.w * 0.02), marginY = Math.round(box.h * 0.06);
    const x0 = box.x + marginX, y0 = box.y + marginY;
    const w = box.w - marginX * 2, h = box.h - marginY * 2;
    if (w < 10 || h < 6) return null;

    const values: number[] = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) values.push(lum[(y0 + y) * img.width + x0 + x]);
    const sorted = [...values].sort((a, b) => a - b);
    const bright = sorted[Math.floor(sorted.length * 0.85)];
    const dark = sorted[Math.floor(sorted.length * 0.05)];
    if (bright - dark < 30) return null; // sem contraste: não há dígitos
    const threshold = dark + (bright - dark) * 0.5;

    const ink = new Uint8Array(w * h);
    values.forEach((v, i) => { if (v < threshold) ink[i] = 1; });
    removeBorderInk(ink, w, h);
    return { ink, w, h };
}

// A moldura escura do visor encosta na borda da caixa; os dígitos não.
// Apaga tudo que está ligado à borda para sobrar só os segmentos.
function removeBorderInk(ink: Uint8Array, w: number, h: number) {
    const stack: number[] = [];
    const push = (p: number) => { if (ink[p]) { ink[p] = 0; stack.push(p); } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (stack.length) {
        const p = stack.pop()!;
        const x = p % w, y = (p - x) / w;
        if (x > 0) push(p - 1);
        if (x < w - 1) push(p + 1);
        if (y > 0) push(p - w);
        if (y < h - 1) push(p + w);
    }
}

// Faixa vertical onde estão os dígitos
function digitBand(grid: InkGrid): [number, number] | null {
    const rows = new Array(grid.h).fill(0);
    for (let y = 0; y < grid.h; y++) for (let x = 0; x < grid.w; x++) rows[y] += grid.ink[y * grid.w + x];
    const active = rows.map(c => c > grid.w * 0.03);
    let best: [number, number] | null = null;
    let start = -1, gap = 0;
    for (let y = 0; y <= grid.h; y++) {
        if (y < grid.h && active[y]) {
            if (start < 0) start = y;
            gap = 0;
        } else if (start >= 0) {
            gap++;
            if (gap > Math.max(1, grid.h * 0.04) || y === grid.h) {
                const end = y - gap;
                if (!best || end - start > best[1] - best[0]) best = [start, end];
                start = -1;
                gap = 0;
            }
        }
    }
    return best && best[1] - best[0] >= grid.h * 0.3 ? best : null;
}

// Dígitos de 7 segmentos costumam ser inclinados (itálico); acha a inclinação que
// deixa as colunas de tinta mais "limpas" e endireita os dígitos.
function deskew(grid: InkGrid, top: number, bottom: number): InkGrid {
    const bandH = bottom - top + 1;
    let bestShear = 0, bestScore = Infinity;
    for (let s = -0.35; s <= 0.351; s += 0.05) {
        const cols = new Set<number>();
        for (let y = top; y <= bottom; y++) {
            const offset = Math.round(s * (bottom - y));
            for (let x = 0; x < grid.w; x++) if (grid.ink[y * grid.w + x]) cols.add(x - offset);
        }
        if (cols.size < bestScore) { bestScore = cols.size; bestShear = s; }
    }
    const pad = Math.ceil(Math.abs(bestShear) * bandH);
    const w = grid.w + pad;
    const ink = new Uint8Array(w * bandH);
    for (let y = top; y <= bottom; y++) {
        const shift = Math.round(bestShear * (bottom - y));
        for (let x = 0; x < grid.w; x++) {
            if (!grid.ink[y * grid.w + x]) continue;
            const nx = x - shift + (bestShear > 0 ? pad : 0);
            if (nx >= 0 && nx < w) ink[(y - top) * w + nx] = 1;
        }
    }
    return { ink, w, h: bandH };
}

function classifyDigit(grid: InkGrid, x0: number, x1: number): { char: string; confidence: number } {
    const fractions = SEGMENT_REGIONS.map(([rx0, rx1, ry0, ry1]) => {
        const sx = Math.floor(x0 + (x1 - x0 + 1) * rx0), ex = Math.ceil(x0 + (x1 - x0 + 1) * rx1);
        const sy = Math.floor(grid.h * ry0), ey = Math.ceil(grid.h * ry1);
        let on = 0, total = 0;
        for (let y = sy; y < ey; y++) for (let x = sx; x < ex; x++) {
            total++;
            on += grid.ink[y * grid.w + x];
        }
        return total ? on / total : 0;
    });
    // "Quão aceso" cada segmento está, relativo aos segmentos mais acesos do próprio dígito
    const ref = Math.max(0.15, [...fractions].sort((a, b) => b - a)[1]);
    const level = fractions.map(f => Math.min(1, f / ref));

    // Nota suave: segmento esperado aceso perde pelo que falta; apagado perde pelo que sobra
    let best = { char: '?', cost: Infinity }, second = Infinity;
    for (const [char, pattern] of DIGIT_PATTERNS) {
        const cost = pattern.reduce((c, on, i) => c + (on ? 1 - level[i] : level[i]), 0);
        if (cost < best.cost) {
            if (best.char !== char) second = best.cost;
            best = { char, cost };
        } else if (char !== best.char && cost < second) {
            second = cost;
        }
    }

    if (best.cost > 2) return { char: '?', confidence: 0 };
    const margin = Math.min(1, (second - best.cost) / 1.5);
    return { char: best.char, confidence: Math.max(0, 1 - best.cost / 3.5) * (0.5 + margin / 2) };
}

function readDisplay(grid: InkGrid): { text: string; confidence: number } | null {
    const band = digitBand(grid);
    if (!band) return null;
    const g = deskew(grid, band[0], band[1]);

    // Colunas com tinta → grupos (um por dígito, ponto decimal ou "1")
    const cols = new Array(g.w).fill(0);
    const bottomCols = new Array(g.w).fill(0);
    const colMin = new Array(g.w).fill(g.h), colMax = new Array(g.w).fill(-1);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
        if (!g.ink[y * g.w + x]) continue;
        cols[x]++;
        if (y > g.h * 0.75) bottomCols[x]++;
        if (y < colMin[x]) colMin[x] = y;
        if (y > colMax[x]) colMax[x] = y;
    }
    const groups: { x0: number; x1: number; ink: number; bottomInk: number; yMin: number; yMax: number }[] = [];
    for (let x = 0; x < g.w; x++) {
        if (cols[x] < Math.max(1, g.h * 0.06)) continue;
        const last = groups[groups.length - 1];
        if (last && x - last.x1 <= 1) {
            last.x1 = x;
            last.ink += cols[x];
            last.bottomInk += bottomCols[x];
            last.yMin = Math.min(last.yMin, colMin[x]);
            last.yMax = Math.max(last.yMax, colMax[x]);
        } else {
            groups.push({ x0: x, x1: x, ink: cols[x], bottomInk: bottomCols[x], yMin: colMin[x], yMax: colMax[x] });
        }
    }
    if (groups.length === 0) return null;

    const wide = groups.map(gr => gr.x1 - gr.x0 + 1).filter(w => w > g.h * 0.3).sort((a, b) => a - b);
    const digitWidth = wide.length ? wide[Math.floor(wide.length / 2)] : g.h * 0.55;

    let text = '';
    const confidences: number[] = [];
    for (const gr of groups) {
        const width = gr.x1 - gr.x0 + 1;
        const onlyBottom = gr.bottomInk >= gr.ink * 0.8;
        if (onlyBottom && width < digitWidth * 0.5) {
            text += '.';
        } else if (width < digitWidth * 0.5) {
            // "1": traço vertical alto; pontinhos de sujeira são descartados
            if (gr.ink >= g.h * 0.45 && gr.yMax - gr.yMin >= g.h * 0.6) { text += '1'; confidences.push(0.85); }
        } else if (width > digitWidth * 1.6) {
            // dois dígitos grudados: divide ao meio
            const mid = Math.round((gr.x0 + gr.x1) / 2);
            for (const [a, b] of [[gr.x0, mid], [mid + 1, gr.x1]]) {
                const d = classifyDigit(g, a, b);
                text += d.char;
                confidences.push(d.confidence * 0.8);
            }
        } else {
            const d = classifyDigit(g, gr.x0, gr.x1);
            text += d.char;
            confidences.push(d.confidence);
        }
    }

    const digits = text.replace(/[^0-9]/g, '');
    if (digits.length === 0) return null;
    const confidence = confidences.reduce((a, b) => a + b, 0) / Math.max(1, confidences.length);
    return { text: text.replace(/^\.+|\.+$/g, ''), confidence };
}

/** Lê todos os visores de 7 segmentos encontrados na imagem, de cima para baixo. */
export function readSevenSegmentDisplays(img: ImageData): DisplayReading[] {
    const lum = luminanceMap(img);
    const read = (tolerant: boolean) => {
        const readings: DisplayReading[] = [];
        for (const box of findDisplayBoxes(img, tolerant)) {
            const grid = inkInside(img, lum, box);
            if (!grid) continue;
            const result = readDisplay(grid);
            if (result) readings.push({ ...result, box });
        }
        return readings;
    };

    let readings = read(false);
    // Nenhum visor confiável com 3+ dígitos: tenta de novo aceitando fundos mais apagados
    if (!readings.some(r => r.confidence >= 0.5 && r.text.replace(/\D/g, '').length >= 3)) {
        readings = [...readings, ...read(true)];
    }
    return readings.sort((a, b) => a.box.y - b.box.y);
}
