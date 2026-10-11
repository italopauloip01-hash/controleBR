import { readFuelPhotos } from '../../src/utils/fuelPhotoReader';

const out = document.getElementById('out')!;
const load = async (url: string, name: string, type: string) => new File([await (await fetch(url)).blob()], name, { type });

(async () => {
    out.textContent = '';
    const files = { pump: await load('bomba.png', 'bomba.png', 'image/png'), dash: await load('painel.webp', 'painel.webp', 'image/webp') };
    for (const last of [0, 131650, 125000]) {
        const t0 = performance.now();
        const r = await readFuelPhotos(files, last);
        out.textContent += `ultimo KM=${last} (${(performance.now() - t0).toFixed(0)}ms): ${JSON.stringify(r)}\n`;
    }
    // Fotos trocadas (painel no lugar da bomba): não pode inventar valores
    const swapped = await readFuelPhotos({ pump: files.dash, dash: files.pump }, 131650);
    out.textContent += `fotos trocadas: ${JSON.stringify(swapped)}\n`;
    const twoPumps = await readFuelPhotos({ pump: files.dash, dash: files.dash }, 131650);
    out.textContent += `painel 2x (sem bomba): ${JSON.stringify(twoPumps)}\n`;
    const twoDash = await readFuelPhotos({ pump: files.pump, dash: files.pump }, 131650);
    out.textContent += `bomba 2x (sem painel): ${JSON.stringify(twoDash)}\n`;
    (window as any).__done = true;
})();
