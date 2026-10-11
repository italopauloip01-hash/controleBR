import { imageDataFromCanvas, readSevenSegmentDisplays } from './sevenSegment';
import { parseFuelDisplays, type ParsedFuelReading } from './fuelDisplayParser';

export interface FuelPhotoReading extends ParsedFuelReading {
    // Data (YYYY-MM-DD) em que as fotos foram tiradas, quando o arquivo informa
    data_foto: string | null;
}

export interface FuelPhotoFiles {
    pump?: File | null; // foto da bomba (total, litros, preço)
    dash?: File | null; // foto do painel (odômetro) - opcional
}

async function loadCanvas(file: File): Promise<HTMLCanvasElement> {
    let sourceWidth = 0;
    let sourceHeight = 0;
    let drawSource: CanvasImageSource | null = null;
    let cleanup = () => {};

    // 1. Tenta createImageBitmap (rápido e respeita EXIF)
    try {
        if (typeof createImageBitmap === 'function') {
            const bitmap = await createImageBitmap(file);
            sourceWidth = bitmap.width;
            sourceHeight = bitmap.height;
            drawSource = bitmap;
            cleanup = () => bitmap.close();
        }
    } catch (e) {
        console.warn('createImageBitmap falhou, tentando fallback Image():', e);
    }

    // 2. Fallback para HTMLImageElement via blob URL
    if (!drawSource) {
        try {
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const el = new Image();
                const url = URL.createObjectURL(file);
                el.onload = () => resolve(el);
                el.onerror = () => {
                    URL.revokeObjectURL(url);
                    reject(new Error('Erro ao decodificar imagem'));
                };
                el.src = url;
            });
            sourceWidth = img.naturalWidth || img.width;
            sourceHeight = img.naturalHeight || img.height;
            drawSource = img;
            const prevCleanup = cleanup;
            cleanup = () => {
                prevCleanup();
                if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
            };
        } catch (e) {
            console.warn('Image element via blob falhou, tentando FileReader:', e);
        }
    }

    // 3. Fallback para FileReader DataURL (para ambientes restritos)
    if (!drawSource) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Não foi possível ler o arquivo da foto.'));
            reader.readAsDataURL(file);
        });
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error('Formato da imagem não suportado. Tente JPG ou PNG.'));
            el.src = dataUrl;
        });
        sourceWidth = img.naturalWidth || img.width;
        sourceHeight = img.naturalHeight || img.height;
        drawSource = img;
    }

    if (!sourceWidth || !sourceHeight) {
        cleanup();
        throw new Error('A imagem selecionada não pôde ser aberta ou está corrompida.');
    }

    // Redimensiona diretamente para resolução de trabalho (evita Canvas gigante de 48MP estourar memória no celular)
    const MAX_SIDE = 1100;
    const scale = Math.min(1, MAX_SIDE / Math.max(sourceWidth, sourceHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
        cleanup();
        throw new Error('Não foi possível criar o contexto gráfico para ler a imagem.');
    }
    ctx.drawImage(drawSource, 0, 0, canvas.width, canvas.height);
    cleanup();
    return canvas;
}

function photoDate(files: File[]): string | null {
    const timestamps = files.map(f => f.lastModified).filter(ts => ts > 0 && ts <= Date.now());
    if (timestamps.length === 0) return null;
    const d = new Date(Math.min(...timestamps));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Lê os visores das fotos no próprio aparelho (sem internet, sem custo)
export async function readFuelPhotos({ pump, dash }: FuelPhotoFiles, lastMileage = 0): Promise<FuelPhotoReading> {
    if (!pump && !dash) {
        throw new Error('Selecione ao menos uma foto (da bomba ou do painel).');
    }

    let pumpDisplays: ReturnType<typeof readSevenSegmentDisplays> = [];
    let dashDisplays: ReturnType<typeof readSevenSegmentDisplays> = [];
    const validFiles: File[] = [];

    if (pump) {
        validFiles.push(pump);
        const canvas = await loadCanvas(pump);
        pumpDisplays = readSevenSegmentDisplays(imageDataFromCanvas(canvas));
    }

    if (dash) {
        validFiles.push(dash);
        const canvas = await loadCanvas(dash);
        dashDisplays = readSevenSegmentDisplays(imageDataFromCanvas(canvas));
    }

    return { ...parseFuelDisplays(pumpDisplays, dashDisplays, lastMileage), data_foto: photoDate(validFiles) };
}
