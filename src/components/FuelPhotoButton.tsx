import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { readFuelPhotos, MAX_FUEL_PHOTOS, type FuelPhotoReading } from '../utils/fuelPhotoReader';

interface FuelPhotoButtonProps {
    onResult: (reading: FuelPhotoReading) => void;
    label?: string;
    className?: string;
}

// Abre a galeria/câmera, envia as fotos da bomba e do painel e devolve os dados lidos
export default function FuelPhotoButton({ onResult, label = 'Ler fotos', className = '' }: FuelPhotoButtonProps) {
    const { showToast } = useNotification();
    const inputRef = useRef<HTMLInputElement>(null);
    const [isReading, setIsReading] = useState(false);

    const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (files.length === 0) return;
        if (files.length > MAX_FUEL_PHOTOS) {
            showToast(`Usando apenas as ${MAX_FUEL_PHOTOS} primeiras fotos.`, 'info');
        }

        setIsReading(true);
        try {
            const reading = await readFuelPhotos(files);
            const found = [reading.odometro_km, reading.litros, reading.valor_total].filter(v => v != null).length;
            if (found === 0) {
                showToast('Não encontrei KM, litros ou valor nas fotos. Tente fotos mais nítidas.', 'error');
                return;
            }
            onResult(reading);
        } catch (error: any) {
            console.error('Error reading fuel photos:', error);
            showToast(error?.message || 'Não foi possível ler as fotos.', 'error');
        } finally {
            setIsReading(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isReading}
                className={`flex items-center justify-center gap-2 font-bold transition-all disabled:opacity-60 disabled:cursor-wait ${className}`}
                title="Importar KM, litros e valor a partir das fotos da bomba e do painel"
            >
                {isReading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                <span>{isReading ? 'Lendo fotos...' : label}</span>
            </button>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFiles}
                className="hidden"
            />
        </>
    );
}
