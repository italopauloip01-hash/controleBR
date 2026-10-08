import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { DownloadCloud, X } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { UpdatePlugin } from '../utils/updatePlugin';

// Chave no localStorage para suprimir o banner após o usuário já ter iniciado o update
const DISMISSED_VERSION_KEY = 'update_dismissed_version';

function isNewerVersion(current: string, latest: string) {
    // Normaliza as versões (remove 'v', espaços e lida com sufixos)
    const normalize = (v: string) => v.replace(/^v/, '').trim().split('.').map(n => parseInt(n, 10) || 0);
    
    const v1 = normalize(current);
    const v2 = normalize(latest);
    
    console.log(`UpdateCheck: Comparando ${current} (parsed: ${v1.join('.')}) com ${latest} (parsed: ${v2.join('.')})`);

    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
        const n1 = v1[i] || 0;
        const n2 = v2[i] || 0;
        if (n1 < n2) return true;
        if (n1 > n2) return false;
    }
    return false;
}

export default function UpdateBanner() {
    const [hasUpdate, setHasUpdate] = useState(false);
    const [latestVersion, setLatestVersion] = useState('');
    const [downloadUrl, setDownloadUrl] = useState('');
    const [isVisible, setIsVisible] = useState(true);
    const { showToast } = useNotification();

    useEffect(() => {
        // Mostra o aviso de atualização apenas no app Android
        if (!Capacitor.isNativePlatform()) return;

        const checkGitHub = async () => {
            try {
                // Obtém a versão real do app rodando no dispositivo
                const { versionName } = await UpdatePlugin.getAppVersion();
                
                const res = await fetch('https://api.github.com/repos/italopauloip01-hash/controleBR/releases/latest');
                if (!res.ok) {
                    console.warn('UpdateCheck: Falha ao buscar releases do GitHub status:', res.status);
                    return;
                }

                const data = await res.json();
                const latestTag = data.tag_name || '';

                console.log(`UpdateCheck: Local=${versionName}, GitHub=${latestTag}`);
                
                const hasUpdateAvailable = isNewerVersion(versionName, latestTag);
                console.log(`UpdateCheck: Resultado da comparação: ${hasUpdateAvailable ? 'NOVA VERSÃO DISPONÍVEL' : 'APP ATUALIZADO'}`);

                // Encontrar a URL do APK nos assets
                let apkAssetUrl = '';
                if (data.assets && Array.isArray(data.assets)) {
                    const apkAsset = data.assets.find((a: any) => a.name.endsWith('.apk'));
                    if (apkAsset) {
                        apkAssetUrl = apkAsset.browser_download_url;
                    }
                }

                // Se o usuário já iniciou o download desta versão (dismiss salvo), não mostrar novamente
                const dismissedVersion = localStorage.getItem(DISMISSED_VERSION_KEY);
                if (dismissedVersion === latestTag) {
                    console.log(`UpdateCheck: Versão ${latestTag} já foi descartada anteriormente.`);
                    return;
                }

                // Se a versão instalada já for igual ou maior, não mostrar
                if (!hasUpdateAvailable) {
                    return;
                }

                setDownloadUrl(apkAssetUrl);
                setLatestVersion(latestTag);
                setHasUpdate(true);
            } catch (err) {
                console.error('UpdateCheck: Falha crítica na checagem:', err);
            }
        };

        checkGitHub();
    }, []);

    const handleUpdate = async () => {
        try {
            if (!downloadUrl) {
                showToast('❌ Link de download não encontrado.', 'error');
                return;
            }

            // Salva que o usuário já iniciou o update desta versão
            if (latestVersion) {
                localStorage.setItem(DISMISSED_VERSION_KEY, latestVersion);
            }
            setIsVisible(false);
            showToast('🔄 Iniciando download da atualização...', 'success');
            
            // Chama o download direto no plugin nativo
            await UpdatePlugin.downloadUpdate({ url: downloadUrl });
        } catch (e) {
            console.error('Update clicked error:', e);
            showToast('❌ Erro ao iniciar download.', 'error');
        }
    };

    const handleDismiss = () => {
        // Fechar sem instalar — não salva o dismiss para que apareça novamente na próxima abertura
        setIsVisible(false);
    };

    if (!hasUpdate || !isVisible) return null;

    return (
        <div className="no-print fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-96 z-50 bg-[#2563eb] text-white rounded-xl shadow-xl overflow-hidden animate-fade-in flex flex-col border border-blue-400">
            <div className="flex items-center justify-between p-4 bg-[#1e40af]">
                <div className="flex items-center gap-2">
                    <DownloadCloud size={20} />
                    <span className="font-bold">Nova Atualização Disponível!</span>
                </div>
                <button
                    onClick={handleDismiss}
                    className="p-1 rounded-full hover:bg-blue-600 transition-colors"
                    title="Fechar"
                >
                    <X size={18} />
                </button>
            </div>
            <div className="p-4">
                <p className="text-sm mb-4">
                    A versão <strong className="font-bold">{latestVersion}</strong> do seu app ControleBR acabou de sair na nuvem! Clique abaixo para baixar e instalá-la no seu celular agora mesmo.
                </p>
                <button
                    onClick={handleUpdate}
                    className="w-full bg-white text-blue-700 font-bold py-3 px-4 rounded-lg shadow hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                >
                    <DownloadCloud size={20} />
                    Instalar Agora
                </button>
            </div>
        </div>
    );
}
