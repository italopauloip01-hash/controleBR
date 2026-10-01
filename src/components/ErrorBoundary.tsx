import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, LogOut } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.hash = '#/';
    window.location.reload();
  };

  private handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }
    localStorage.clear();
    window.location.hash = '#/login';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090b] text-[#f43f5e] flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mb-6 border border-rose-500/20 shadow-xl shadow-rose-500/10 animate-bounce">
            <AlertTriangle size={36} />
          </div>

          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
            Ops! Algo inesperado aconteceu
          </h2>
          <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
            O aplicativo detectou um erro ao renderizar os dados da sua conta. Seus dados estão seguros na nuvem.
          </p>

          {this.state.error && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 max-w-lg w-full text-left mb-6 overflow-x-auto text-xs text-zinc-300 font-mono">
              <p className="text-rose-400 font-bold mb-1">{this.state.error.name}: {this.state.error.message}</p>
              {this.state.error.stack && (
                <p className="text-zinc-500 text-[10px] whitespace-pre-wrap line-clamp-4">{this.state.error.stack}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-sm transition-all shadow-lg shadow-indigo-600/30 active:scale-95 cursor-pointer"
            >
              <RefreshCw size={16} />
              Recarregar Painel
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.hash = '#/';
              }}
              className="flex items-center gap-2 px-6 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-2xl text-sm border border-zinc-700 transition-all active:scale-95 cursor-pointer"
            >
              <Home size={16} />
              Ir para o Início
            </button>
            <button
              onClick={this.handleLogout}
              className="flex items-center gap-2 px-6 py-3.5 bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 font-bold rounded-2xl text-sm border border-zinc-800 hover:border-rose-500/30 transition-all active:scale-95 cursor-pointer"
            >
              <LogOut size={16} />
              Sair da Conta
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
