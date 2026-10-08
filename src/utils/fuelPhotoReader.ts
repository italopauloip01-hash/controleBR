import { imageDataFromCanvas, readSevenSegmentDisplays } from './sevenSegment';
import { parseFuelDisplays, type ParsedFuelReading } from './fuelDisplayParser';

export interface FuelPhotoReading extends ParsedFuelReading {
    // Data (YYYY-MM-DD) em que as fotos foram tiradas, quando o arquivo informa
    data_foto: string | null;
}

export interface FuelPhotoFiles {
    pump: File; // foto da bomba (total, litros, preço)
    dash: File; // foto do painel (odômetro)
}

async function loadCanvas(file: File): Promise<HTMLCanvasElement> {
    // createImageBitmap já respeita a orientação EXIF (foto em pé/deitada)
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
    bitmap.close();
    return canvas;
}

function photoDate(files: File[]): string | null {
    const timestamps = files.map(f => f.lastModified).filter(ts => ts > 0 && ts <= Date.now());
    if (timestamps.length === 0) return null;
    const d = new Date(Math.min(...timestamps));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Lê os visores de 7 segmentos das duas fotos no próprio aparelho (sem internet, sem custo)
export async function readFuelPhotos({ pump, dash }: FuelPhotoFiles, lastMileage = 0): Promise<FuelPhotoReading> {
    const pumpDisplays = readSevenSegmentDisplays(imageDataFromCanvas(await loadCanvas(pump)));
    const dashDisplays = readSevenSegmentDisplays(imageDataFromCanvas(await loadCanvas(dash)));

    return { ...parseFuelDisplays(pumpDisplays, dashDisplays, lastMileage), data_foto: photoDate([pump, dash]) };
}
