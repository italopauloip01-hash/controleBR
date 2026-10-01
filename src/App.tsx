import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import UpdateBanner from './components/UpdateBanner';
import Dashboard from './pages/Dashboard';
import Receitas from './pages/Receitas';
import Despesas from './pages/Despesas';
import Extrato from './pages/Extrato';
import Contas from './pages/Contas';
import Cartoes from './pages/Cartoes';
import Categorias from './pages/Categorias';
import Metas from './pages/Metas';
import Investimentos from './pages/Investimentos';
import Configuracoes from './pages/Configuracoes';
import Veiculos from './pages/Veiculos';
import Login from './pages/Login';
import { FinanceProvider } from './context/FinanceContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GamificationProvider } from './context/GamificationContext';
import { NotificationProvider } from './context/NotificationContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-[var(--bg-color)] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
    </div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <FinanceProvider>
      <GamificationProvider>
        <div className="app-container">
          {/* Mobile Header */}
          <div className="lg:hidden fixed top-0 left-0 w-full bg-[var(--bg-card)] border-b border-[var(--border-color)] z-40 flex items-center justify-between px-4 h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)]">
            <div className="font-bold text-xl text-[var(--color-xp)] flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-xp-light)] flex items-center justify-center">$</div>
              ControleBR
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -mr-2 text-[var(--text-primary)]"
            >
              <Menu size={24} />
            </button>
          </div>

          {/* Mobile Sidebar Overlay */}
          {isMobileMenuOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/receitas" element={<Receitas />} />
              <Route path="/despesas" element={<Despesas />} />
              <Route path="/extrato" element={<Extrato />} />
              <Route path="/contas" element={<Contas />} />
              <Route path="/cartoes" element={<Cartoes />} />
              <Route path="/categorias" element={<Categorias />} />
              <Route path="/metas" element={<Metas />} />
              <Route path="/investimentos" element={<Investimentos />} />
              <Route path="/veiculos" element={<Veiculos />} />
              <Route path="/config" element={<Configuracoes />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <BottomNav />
          <UpdateBanner />
        </div>
      </GamificationProvider>
    </FinanceProvider>
  );
}

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <NotificationProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
