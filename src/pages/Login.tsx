import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Target, ArrowRight, Wallet, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Se já está logado, redireciona imediatamente
    if (user) {
        navigate('/', { replace: true });
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (!isLogin && password !== confirmPassword) {
            setError('As senhas não coincidem!');
            setIsLoading(false);
            return;
        }

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                // Redirecionar imediatamente após login bem-sucedido
                navigate('/', { replace: true });
                return;
            } else {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: name,
                        }
                    }
                });
                if (signUpError) throw signUpError;

                // Opt-in alert handling depending on email confirmation settings
                alert('Conta criada com sucesso! Você já pode fazer login (ou verificar seu email se necessário).');
                setIsLogin(true);
            }
        } catch (err: any) {
            console.error('Auth error:', err);
            // Supabase often returns generic messaging on signUp if email is confirmed etc.
            if (!isLogin && err.message.includes('User already registered')) {
                setError('Este email já está cadastrado. Vá para a tela de Login.');
            } else {
                setError(err.message || 'Ocorreu um erro durante a autenticação.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex text-[var(--color-text)] bg-[var(--bg-color)]">

            {/* LEFT SIDE - BRANDING / VISUALS */}
            <div className="hidden lg:flex w-[45%] bg-[var(--bg-card)] relative overflow-hidden flex-col justify-between p-12 border-r border-[var(--border)]">
                {/* Background Decorators */}
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[var(--color-xp)] rounded-full mix-blend-multiply filter blur-[100px] opacity-20"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[var(--color-investimento)] rounded-full mix-blend-multiply filter blur-[100px] opacity-20"></div>

                <div className="relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--color-xp)] to-[var(--color-investimento)] text-white shadow-lg flex items-center justify-center font-black text-3xl mb-6">
                        $
                    </div>
                    <h1 className="text-4xl font-extrabold text-[var(--text-primary)] leading-tight">
                        ControleBR
                    </h1>
                    <p className="text-lg text-[var(--text-secondary)] mt-4 font-medium max-w-sm">
                        O seu futuro financeiro começa a ser construído no presente.
                    </p>
                </div>

                <div className="relative z-10 space-y-6">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-[var(--bg-secondary)] bg-opacity-50 backdrop-blur-sm border border-[var(--border)]">
                        <div className="bg-[var(--color-xp-light)] p-2 rounded-lg text-[var(--color-xp)]">
                            <Target size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-[var(--text-primary)]">Gestão Focada</h3>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">Metas claras e relatórios intuitivos para onde seu dinheiro vai.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-[var(--bg-secondary)] bg-opacity-50 backdrop-blur-sm border border-[var(--border)]">
                        <div className="bg-[var(--color-receita-light)] p-2 rounded-lg text-[var(--color-receita)]">
                            <Wallet size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-[var(--text-primary)]">Controle Completo</h3>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">Carros, contas fixas e cartões de crédito integrados em um só lugar.</p>
                        </div>
                    </div>
                </div>

                <div className="relative z-10">
                    <p className="text-sm text-[var(--text-muted)] font-medium">© 2026 ControleBR. Todos os direitos reservados.</p>
                </div>
            </div>

            {/* RIGHT SIDE - FORM */}
            <div className="w-full lg:w-[55%] flex items-center justify-center p-6 sm:p-12 relative">

                {/* Mobile Header (Hidden on Desktop) */}
                <div className="absolute top-8 left-8 lg:hidden flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-xp)] to-[var(--color-investimento)] text-white shadow-lg flex items-center justify-center font-bold text-xl">
                        $
                    </div>
                    <span className="font-bold text-xl text-[var(--text-primary)]">ControleBR</span>
                </div>

                <div className="w-full max-w-md">
                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3">
                            {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
                        </h2>
                        <p className="text-[var(--text-secondary)]">
                            {isLogin ? 'Insira seus dados para acessar sua carteira.' : 'Junte-se a nós e transforme sua relação com o dinheiro.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-4 rounded-lg bg-red-500 bg-opacity-10 border border-red-500 border-opacity-20 flex items-start gap-3">
                                <ShieldCheck className="text-red-500 mt-0.5" size={20} />
                                <span className="text-sm font-medium text-red-500">{error}</span>
                            </div>
                        )}

                        {!isLogin && (
                            <div className="space-y-1.5">
                                <label className="block text-sm font-semibold text-[var(--text-primary)]">
                                    Nome Completo
                                </label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-4 flex items-center pointer-events-none text-[var(--text-muted)]">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 border border-[var(--border)] rounded-xl bg-[var(--bg-card)] focus:bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-all outline-none focus:border-[var(--color-xp)] focus:ring-4 focus:ring-[var(--color-xp)] focus:ring-opacity-10 placeholder-[var(--text-muted)]"
                                        placeholder="Como devemos te chamar?"
                                        required={!isLogin}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-[var(--text-primary)]">
                                Endereço de Email
                            </label>
                            <div className="relative flex items-center">
                                <div className="absolute left-4 flex items-center pointer-events-none text-[var(--text-muted)]">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border border-[var(--border)] rounded-xl bg-[var(--bg-card)] focus:bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-all outline-none focus:border-[var(--color-xp)] focus:ring-4 focus:ring-[var(--color-xp)] focus:ring-opacity-10 placeholder-[var(--text-muted)]"
                                    placeholder="seu@melhoremail.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="block text-sm font-semibold text-[var(--text-primary)]">
                                    Senha
                                </label>
                                {isLogin && (
                                    <a href="#" className="text-xs font-semibold text-[var(--color-xp)] hover:underline">Esqueceu a senha?</a>
                                )}
                            </div>
                            <div className="relative flex items-center">
                                <div className="absolute left-4 flex items-center pointer-events-none text-[var(--text-muted)]">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3 border border-[var(--border)] rounded-xl bg-[var(--bg-card)] focus:bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-all outline-none focus:border-[var(--color-xp)] focus:ring-4 focus:ring-[var(--color-xp)] focus:ring-opacity-10 placeholder-[var(--text-muted)]"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {!isLogin && (
                            <div className="space-y-1.5">
                                <label className="block text-sm font-semibold text-[var(--text-primary)]">
                                    Confirmar Senha
                                </label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-4 flex items-center pointer-events-none text-[var(--text-muted)]">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-12 pr-12 py-3 border border-[var(--border)] rounded-xl bg-[var(--bg-card)] focus:bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-all outline-none focus:border-[var(--color-xp)] focus:ring-4 focus:ring-[var(--color-xp)] focus:ring-opacity-10 placeholder-[var(--text-muted)]"
                                        placeholder="••••••••"
                                        required={!isLogin}
                                        minLength={6}
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-3.5 px-4 rounded-xl text-white font-semibold bg-gradient-to-r from-[var(--color-xp)] to-blue-500 hover:from-blue-600 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 hover:shadow-lg hover:shadow-[var(--color-xp)]/30 focus:ring-[var(--color-xp)] transition-all disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden mt-8"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processando...
                                    </>
                                ) : (
                                    <>
                                        {isLogin ? 'Acessar Plataforma' : 'Criar minha conta'}
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </span>
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-[var(--border)] text-center">
                        <p className="text-sm text-[var(--text-secondary)]">
                            {isLogin ? 'Ainda não é um membro?' : 'Já faz parte do ControleBR?'}
                            <button
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setError(null);
                                }}
                                className="ml-1.5 text-[var(--color-xp)] hover:text-blue-500 font-bold transition-colors hover:underline"
                            >
                                {isLogin ? 'Cadastre-se agora' : 'Faça login aqui'}
                            </button>
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}
