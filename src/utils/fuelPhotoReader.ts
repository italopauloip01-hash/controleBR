import { supabase } from './supabase';
import type { FuelType } from './fuelUtils';

export interface FuelPhotoReading {
    odometro_km: number | null;
    litros: number | null;
    valor_total: number | null;
    preco_litro: number | null;
    combustivel: FuelType | null;
    observacoes: string;
    // Data (YYYY-MM-DD) em que as fotos foram tiradas, quando o arquivo informa
    data_foto: string | null;
}

export const MAX_FUEL_PHOTOS = 4;
// Slug da Edge Function no Supabase (criada pelo painel com nome automático)
const FUNCTION_SLUG = 'smooth-function';
// Lado maior ideal para visão do Claude; mantém os dígitos legíveis e o upload leve
const MAX_SIDE = 1568;

async function compressImage(file: File): Promise<{ data: string; media_type: string }> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return { data: dataUrl.split(',')[1], media_type: 'image/jpeg' };
}

function photoDate(files: File[]): string | null {
    const timestamps = files.map(f => f.lastModified).filter(ts => ts > 0 && ts <= Date.now());
    if (timestamps.length === 0) return null;
    const d = new Date(Math.min(...timestamps));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function readFuelPhotos(files: File[]): Promise<FuelPhotoReading> {
    const selected = files.slice(0, MAX_FUEL_PHOTOS);
    const images = await Promise.all(selected.map(compressImage));

    const { data, error } = await supabase.functions.invoke(FUNCTION_SLUG,{ body: { images } });

    if (error) {
        // FunctionsHttpError traz a resposta com a mensagem amigável da função
        let message = 'Não foi possível ler as fotos.';
        try {
            const body = await (error as any).context?.json?.();
            if (body?.error) message = body.error;
        } catch { /* mantém a mensagem padrão */ }
        throw new Error(message);
    }

    return { ...(data as Omit<FuelPhotoReading, 'data_foto'>), data_foto: photoDate(selected) };
}
