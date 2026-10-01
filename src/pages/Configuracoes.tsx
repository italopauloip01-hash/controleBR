import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { todayLocalISO } from '../utils/format';
import { useNotification } from '../context/NotificationContext';

import { Capacitor } from '@capacitor/core';
import { 
    Settings, UserCircle, Shield, Download, RefreshCw, 
    LogOut, Moon, Sun, Smartphone, ChevronRight,
    Eye, EyeOff
} from 'lucide-react';
import { UpdatePlugin } from '../utils/updatePlugin';

export default function Configuracoes() {
    const { user } = useAuth();
    const { transactions } = useFinance();
    const { showToast, confirmAction } = useNotification();
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'export' | 'update'>('profile');

    const [isSaving, setIsSaving] = useState(false);
    const [appVersion, setAppVersion] = useState('Buscando...');

    // Security Toggle
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const checkVersion = async () => {
            try {
                const isMobile = !!(window as any).Capacitor?.isNativePlatform();
                if (isMobile) {
                    const info = await UpdatePlugin.getAppVersion();
                    setAppVersion(`v${info.versionName} (Build ${info.versionCode})`);
                } else {
                    setAppVersion('v1.9.0 (Preview Web)');
                }
            } catch (e) {
                setAppVersion('v1.9.0 (Web/Sync Error)');
            }
        };
        checkVersion();
    }, []);

    // Profile State
    const [name, setName] = useState(user?.user_metadata?.full_name || '');
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

    // Security State
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Export State
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await supabase.auth.updateUser({
                data: { full_name: name }
            });
            showToast('Perfil salvo com sucesso!', 'success');
        } catch (error) {
            console.error(error);
            showToast('Erro ao salvar perfil.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSecurity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            showToast('As senhas não coincidem!', 'error');
            return;
        }
        if (password.length < 6) {
            showToast('A senha deve ter pelo menos 6 caracteres.', 'error');
            return;
        }
        setIsSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            showToast('Senha atualizada com sucesso!', 'success');
            setPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error(error);
            showToast('Erro ao atualizar senha: ' + error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportCSV = () => {
        let filteredTransactions = transactions;

        if (exportStartDate) {
            filteredTransactions = filteredTransactions.filter(t => t.date >= exportStartDate);
        }
        if (exportEndDate) {
            filteredTransactions = filteredTransactions.filter(t => t.date <= exportEndDate);
        }

        if (filteredTransactions.length === 0) {
            showToast("Sem dados para o período selecionado.", 'info');
            return;
        }

        const headers = ['Data', 'Descricao', 'Categoria', 'Valor', 'Tipo'];
        const rows = filteredTransactions.map(t => [
            t.date,
            `"${(t.description || '').replace(/"/g, '""')}"`,
            `"${t.category_id || ''}"`,
            t.amount.toString(),
            t.type
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `extrato_financeiro_${todayLocalISO()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Download do extrato iniciado.', 'success');
    };

    const handleLogout = async () => {
        const confirmed = await confirmAction({
            title: 'Sair da Conta',
            message: 'Deseja encerrar sua sessão atual neste dispositivo?',
            confirmText: 'Sair Agora',
            cancelText: 'Cancelar'
        });
        if (!confirmed) return;
        await supabase.auth.signOut();
    };

    const handleCheckUpdate = async () => {
        setIsSaving(true);
        try {
            if (Capacitor.isNativePlatform()) {
                await UpdatePlugin.checkUpdate();
                showToast('Verificação iniciada! Um aviso aparecerá caso haja atualizações.', 'info');
            } else {
                showToast('Atualização disponível apenas no aplicativo Android.', 'info');
            }
        } catch (error: any) {
            console.error('Error checking for updates:', error);
            showToast(`Falha: ${error?.message || error}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const navItems = [
        { id: 'profile', icon: UserCircle, label: 'Perfil e Visuais' },
        { id: 'security', icon: Shield, label: 'Segurança' },
        { id: 'export', icon: Download, label: 'Exportação' },
        { id: 'update', icon: RefreshCw, label: 'Sistema' }
    ] as const;

    return (
        <div className="space-y-8 animate-fade-in pb-24 lg:pb-8">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black text-[var(--text-primary)] flex items-center gap-3 tracking-tight">
                        <div className="p-2.5 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl shadow-lg shadow-gray-900/20">
                            <Settings className="text-white relative z-10" size={28} />
                        </div>
                        Central de Configurações
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-2 font-medium">Controle seu ecossistema financeiro e regras de conta.</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                
                {/* Sidebar Navigation */}
                <div className="w-full md:w-72 flex flex-col gap-2 flex-shrink-0">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-3 rounded-3xl shadow-sm">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${isActive ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon size={20} className={isActive ? 'text-white' : 'text-[var(--text-secondary)]'} />
                                        <span className="font-bold text-sm tracking-wide">{item.label}</span>
                                    </div>
                                    <ChevronRight size={16} className={`transition-transform ${isActive ? 'translate-x-1' : 'opacity-0'}`} />
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-4 rounded-3xl text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 transition-all font-bold tracking-wide active:scale-95"
                    >
                        <LogOut size={18} />
                        Encerrar Sessão
                    </button>

                    <div className="mt-4 pt-4 border-t border-[var(--border-color)]/30 text-center">
                        <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] opacity-50">
                            Versão Instalada
                        </p>
                        <p className="text-xs font-black text-indigo-500 mt-1.5 bg-indigo-500/5 py-1 px-3 rounded-full inline-block">
                            v{appVersion}
                        </p>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 lg:p-8 rounded-3xl shadow-sm min-h-[500px]">
                        
                        {activeTab === 'profile' && (
                            <form onSubmit={handleSaveProfile} className="space-y-8 animate-fade-in">
                                <div>
                                    <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight mb-1">Identidade</h3>
                                    <p className="text-sm font-medium text-[var(--text-secondary)] mb-6">Como o aplicativo deve chamar você.</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="relative">
                                            <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">Nome de Exibição</label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full px-5 py-4 border-2 border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)] text-lg font-bold text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                                                placeholder="Seu Nome"
                                            />
                                        </div>
                                        <div className="relative">
                                            <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">Email de Verificação</label>
                                            <input
                                                type="email"
                                                value={user?.email || ''}
                                                disabled
                                                className="w-full px-5 py-4 border-2 border-[var(--border-color)] rounded-2xl bg-[var(--bg-color)] opacity-60 text-lg font-bold text-[var(--text-secondary)] outline-none cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-[var(--border-color)]">
                                    <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight mb-1">Aparência do Software</h3>
                                    <p className="text-sm font-medium text-[var(--text-secondary)] mb-6">Personalize os tons da interface.</p>
                                    
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setTheme('dark')}
                                            className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${theme === 'dark' ? 'border-indigo-500 bg-indigo-500/10' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--text-secondary)]'}`}
                                        >
                                            <Moon size={24} className={theme === 'dark' ? 'text-indigo-500' : 'text-[var(--text-secondary)]'} />
                                            <span className={`font-bold text-sm ${theme === 'dark' ? 'text-indigo-500' : 'text-[var(--text-primary)]'}`}>Modo Escuro</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTheme('light')}
                                            className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${theme === 'light' ? 'border-indigo-500 bg-indigo-500/10' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--text-secondary)]'}`}
                                        >
                                            <Sun size={24} className={theme === 'light' ? 'text-indigo-500' : 'text-[var(--text-secondary)]'} />
                                            <span className={`font-bold text-sm ${theme === 'light' ? 'text-indigo-500' : 'text-[var(--text-primary)]'}`}>Modo Claro</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-6 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="w-full md:w-auto bg-indigo-600 text-white font-black py-4 px-8 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25 active:scale-95 disabled:opacity-50"
                                    >
                                        {isSaving ? 'Aplicando...' : 'SALVAR PREFERÊNCIAS'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {activeTab === 'security' && (
                            <form onSubmit={handleSaveSecurity} className="space-y-8 animate-fade-in">
                                <div>
                                    <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight mb-1">Cofre de Acesso</h3>
                                    <p className="text-sm font-medium text-[var(--text-secondary)] mb-6">Mantenha sua chave de segurança atualizada.</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="relative">
                                            <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">Nova Credencial</label>
                                            <div className="relative flex items-center">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="w-full px-5 py-4 border-2 border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)] text-lg font-bold text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors pr-12"
                                                    placeholder="Mín. 6 caracteres"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 text-[var(--text-secondary)] hover:text-indigo-500 transition-colors"
                                                >
                                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">Confirmação Mútua</label>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full px-5 py-4 border-2 border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)] text-lg font-bold text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                                                placeholder="Repita a senha"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="w-full md:w-auto bg-indigo-600 text-white font-black py-4 px-8 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25 active:scale-95 disabled:opacity-50"
                                    >
                                        {isSaving ? 'Criptografando...' : 'ATUALIZAR CHAVE'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {activeTab === 'export' && (
                            <div className="space-y-8 animate-fade-in">
                                <div>
                                    <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight mb-1">Backup e Relatório</h3>
                                    <p className="text-sm font-medium text-[var(--text-secondary)] mb-6">Extraia toda a movimentação financeira para análises no Excel.</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--bg-secondary)] p-6 rounded-3xl border border-[var(--border-color)]">
                                        <div>
                                            <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">Fatia Inicial</label>
                                            <input
                                                type="date"
                                                value={exportStartDate}
                                                onChange={(e) => setExportStartDate(e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-[var(--border-color)] rounded-xl bg-[var(--bg-card)] text-sm font-bold text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 px-1">Fatia Final</label>
                                            <input
                                                type="date"
                                                value={exportEndDate}
                                                onChange={(e) => setExportEndDate(e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-[var(--border-color)] rounded-xl bg-[var(--bg-card)] text-sm font-bold text-[var(--text-primary)] outline-none focus:border-indigo-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        onClick={handleExportCSV}
                                        className="w-full bg-[#107c41] text-white font-black py-5 px-6 rounded-2xl hover:bg-[#0c6130] transition-all shadow-lg shadow-green-600/20 active:scale-[0.99] flex items-center justify-center gap-3"
                                    >
                                        <Download size={22} />
                                        BAIXAR PLANILHA CSV
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'update' && (
                            <div className="space-y-8 animate-fade-in">
                                <div>
                                    <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight mb-1">Versão e Estabilidade</h3>
                                    <p className="text-sm font-medium text-[var(--text-secondary)] mb-6">Canal oficial de Updates via GitHub Actions.</p>
                                    
                                    <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-gradient-to-r from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-3xl gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                                                <Smartphone size={28} />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-lg tracking-tight text-[var(--text-primary)]">Versão Local: v{appVersion}</h4>
                                                <p className="text-xs font-bold text-[var(--text-secondary)]">Plataforma Híbrida Capacitor</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleCheckUpdate}
                                            disabled={isSaving}
                                            className="w-full md:w-auto bg-[var(--text-primary)] text-[var(--bg-color)] font-bold py-3.5 px-6 rounded-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {isSaving ? 'Verificando...' : 'Procurar Updates'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
