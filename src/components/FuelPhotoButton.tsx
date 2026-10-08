import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Loader2, Fuel, Gauge, CheckCircle2, X, RefreshCw } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useFinance } from '../context/FinanceContext';
import { readFuelPhotos, type FuelPhotoReading } from '../utils/fuelPhotoReader';

interface FuelPhotoButtonProps {
    onResult: (reading: FuelPhotoReading) => void;
    vehicleId?: string;
    label?: string;
    className?: string;
}

type Step = 'pump' | 'dash';

const STEPS: Record<Step, { number: number; title: string; hint: string; icon: typeof Fuel }> = {
    pump: {
        number: 1,
        title: 'Foto da BOMBA',
        hint: 'Mostre os 3 visores: Total a pagar, Litros e Preço por litro.',
        icon: Fuel,
    },
    dash: {
        number: 2,
        title: 'Foto do PAINEL',
        hint: 'Mostre o número do odômetro (KM total) do carro.',
        icon: Gauge,
    },
};

// Fluxo guiado em 2 fotos obrigatórias: 1ª da bomba, 2ª do painel.
// Cada foto tem papel fixo, então os números de uma não se confundem com os da outra.
export default function FuelPhotoButton({ onResult, vehicleId, label = 'Ler fotos', className = '' }: FuelPhotoButtonProps) {
    const { showToast } = useNotification();
    const { transactions } = useFinance();
    const inputRef = useRef<HTMLInputElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [pumpFile, setPumpFile] = useState<File | null>(null);
    const [dashFile, setDashFile] = useState<File | null>(null);
    const [isReading, setIsReading] = useState(false);
    const [previews, setPreviews] = useState<{ pump?: string; dash?: string }>({});

    const currentStep: Step = pumpFile ? 'dash' : 'pump';

    // Último KM registrado ajuda a achar o hodômetro entre os números do painel
    const lastMileage = () => {
        const filterByVehicle = !!vehicleId && vehicleId !== 'all';
        return Math.max(0, ...transactions
            .filter(t => t.mileage && (!filterByVehicle || t.vehicle_id === vehicleId))
            .map(t => t.mileage as number));
    };

    const reset = () => {
        if (previews.pump) URL.revokeObjectURL(previews.pump);
        if (previews.dash) URL.revokeObjectURL(previews.dash);
        setPumpFile(null);
        setDashFile(null);
        setPreviews({});
    };

    const close = () => {
        if (isReading) return;
        reset();
        setIsOpen(false);
    };

    const read = async (pump: File, dash: File) => {
        setIsReading(true);
        try {
            const reading = await readFuelPhotos({ pump, dash }, lastMileage());
            const found = [reading.odometro_km, reading.litros, reading.valor_total].filter(v => v != null).length;
            if (found === 0) {
                showToast('Não consegui ler os números. Tente fotos mais nítidas, de frente e sem reflexo.', 'error');
                return;
            }
            onResult(reading);
            reset();
            setIsOpen(false);
        } catch (error) {
            console.error('Error reading fuel photos:', error);
            showToast(error instanceof Error ? error.message : 'Não foi possível ler as fotos.', 'error');
        } finally {
            setIsReading(false);
        }
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        if (currentStep === 'pump') {
            setPumpFile(file);
            setPreviews(p => ({ ...p, pump: URL.createObjectURL(file) }));
        } else {
            if (pumpFile && file.name === pumpFile.name && file.size === pumpFile.size) {
                showToast('Essa é a mesma foto da bomba. Escolha agora a foto do PAINEL.', 'error');
                return;
            }
            setDashFile(file);
            setPreviews(p => ({ ...p, dash: URL.createObjectURL(file) }));
            if (pumpFile) read(pumpFile, file);
        }
    };

    const renderSlot = (step: Step, file: File | null, preview?: string) => {
        const info = STEPS[step];
        const Icon = info.icon;
        const isCurrent = currentStep === step && !dashFile;
        return (
            <div className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                file ? 'border-emerald-500/40 bg-emerald-500/5'
                    : isCurrent ? 'border-[var(--color-carro)] bg-[var(--color-carro)]/5'
                    : 'border-[var(--border-color)] opacity-50'
            }`}>
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-[var(--bg-secondary)] flex items-center justify-center border border-[var(--border-color)]">
                    {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : <Icon size={24} className="text-[var(--color-carro)]" />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Passo {info.number} de 2</p>
                    <p className="font-black text-[var(--text-primary)] text-sm">{info.title}</p>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-snug">{info.hint}</p>
                </div>
                {file && <CheckCircle2 size={22} className="text-emerald-500 shrink-0" />}
            </div>
        );
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={`flex items-center justify-center gap-2 font-bold transition-all ${className}`}
                title="Importar KM, litros e valor a partir das fotos da bomba e do painel"
            >
                <Camera size={18} />
                <span>{label}</span>
            </button>

            <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

            {/* Portal no <body>: a página tem animação (transform), que prenderia a janela atrás da barra de navegação */}
            {isOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]" onMouseDown={close}>
                    <div
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl shadow-2xl w-full max-w-md max-h-full overflow-y-auto p-5 flex flex-col gap-4"
                        onMouseDown={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Camera size={20} className="text-[var(--color-carro)]" />
                                <h3 className="font-black text-lg text-[var(--text-primary)]">Abastecimento por foto</h3>
                            </div>
                            <button type="button" onClick={close} disabled={isReading} className="p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] disabled:opacity-40">
                                <X size={20} />
                            </button>
                        </div>

                        {renderSlot('pump', pumpFile, previews.pump)}
                        {renderSlot('dash', dashFile, previews.dash)}

                        {isReading ? (
                            <div className="flex items-center justify-center gap-2 py-4 font-bold text-[var(--color-carro)]">
                                <Loader2 size={20} className="animate-spin" /> Lendo as fotos...
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                {pumpFile && (
                                    <button
                                        type="button"
                                        onClick={reset}
                                        className="px-4 py-3.5 rounded-2xl border-2 border-[var(--border-color)] text-[var(--text-secondary)] font-bold flex items-center gap-1.5"
                                    >
                                        <RefreshCw size={16} /> Refazer
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => (dashFile && pumpFile ? read(pumpFile, dashFile) : inputRef.current?.click())}
                                    className="flex-1 py-3.5 rounded-2xl bg-[var(--color-carro)] text-white font-black flex items-center justify-center gap-2 shadow-md"
                                >
                                    <Camera size={18} />
                                    {dashFile ? 'Ler novamente' : `Escolher foto ${STEPS[currentStep].number} de 2`}
                                </button>
                            </div>
                        )}
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}
