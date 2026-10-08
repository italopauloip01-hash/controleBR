import { Capacitor, registerPlugin } from '@capacitor/core';
import { parseFuelPhotos, type OcrPhoto, type ParsedFuelReading } from './fuelOcrParser';

// Plugin nativo (android/.../TextReaderPlugin.java): leitura de texto offline com Google ML Kit
interface TextReaderPluginContract {
    recognize(options: { image: string }): Promise<OcrPhoto & { text: string }>;
}
const TextReaderPlugin = registerPlugin<TextReaderPluginContract>('TextReaderPlugin');

export interface FuelPhotoReading extends ParsedFuelReading {
    // Data (YYYY-MM-DD) em que as fotos foram tiradas, quando o arquivo informa
    data_foto: string | null;
}

export const MAX_FUEL_PHOTOS = 4;
const MAX_SIDE = 1600;

async function loadCanvas(file: File): Promise<HTMLCanvasElement> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas;
}

// Versão em tons de cinza invertida e com contraste esticado: dígitos de LED/LCD
// (claros em fundo escuro) viram texto escuro em fundo claro, que o leitor entende melhor.
function contrastVariant(source: HTMLCanvasElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(source, 0, 0);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = img.data;

    let min = 255, max = 0;
    for (let i = 0; i < px.length; i += 4) {
        const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        px[i] = g;
        if (g < min) min = g;
        if (g > max) max = g;
    }
    const range = Math.max(1, max - min);
    for (let i = 0; i < px.length; i += 4) {
        const v = 255 - ((px[i] - min) / range) * 255;
        px[i] = px[i + 1] = px[i + 2] = v;
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

const toBase64 = (canvas: HTMLCanvasElement) => canvas.toDataURL('image/jpeg', 0.9).split(',')[1];

function photoDate(files: File[]): string | null {
    const timestamps = files.map(f => f.lastModified).filter(ts => ts > 0 && ts <= Date.now());
    if (timestamps.length === 0) return null;
    const d = new Date(Math.min(...timestamps));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function readFuelPhotos(files: File[], lastMileage = 0): Promise<FuelPhotoReading> {
    if (!Capacitor.isNativePlatform()) {
        throw new Error('A leitura por foto funciona no app Android (instale o APK).');
    }

    const selected = files.slice(0, MAX_FUEL_PHOTOS);
    const photos: OcrPhoto[] = [];

    for (const file of selected) {
        const canvas = await loadCanvas(file);
        // Lê a foto original e a versão de alto contraste; junta as linhas das duas leituras
        const [original, enhanced] = await Promise.all([
            TextReaderPlugin.recognize({ image: toBase64(canvas) }),
            TextReaderPlugin.recognize({ image: toBase64(contrastVariant(canvas)) }),
        ]);
        photos.push({
            lines: [...original.lines, ...enhanced.lines],
            width: original.width,
            height: original.height,
        });
    }

    return { ...parseFuelPhotos(photos, lastMileage), data_foto: photoDate(selected) };
}
