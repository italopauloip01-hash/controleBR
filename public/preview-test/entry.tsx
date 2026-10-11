import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../../src/index.css';
import { FinanceContext } from '../../src/context/FinanceContext';
import { NotificationProvider } from '../../src/context/NotificationContext';
import BottomNav from '../../src/components/BottomNav';
import FuelPhotoButton from '../../src/components/FuelPhotoButton';

const value = {
    accounts: [], categories: [], transactions: [], creditCards: [], goals: [], investments: [], vehicles: [], categoryMap: {},
    isLoading: false, selectedMonth: 9, setSelectedMonth: () => {}, selectedYear: 2026, setSelectedYear: () => {}, refreshData: async () => {},
};

createRoot(document.getElementById('root')!).render(
    <NotificationProvider>
        <FinanceContext.Provider value={value as never}>
            <MemoryRouter initialEntries={['/veiculos']}>
                <div className="app-container">
                    <main className="main-content">
                        {/* mesma animação (transform) da página de Veículos */}
                        <div className="space-y-6 pb-24 animate-fade-in" style={{ transform: 'translateZ(0)' }}>
                            <h1 className="text-3xl font-black text-[var(--text-primary)]">Gestão de Frota</h1>
                            <FuelPhotoButton onResult={() => {}} label="Foto" className="p-3 bg-[var(--color-carro)] text-white rounded-xl" />
                            <div style={{ height: 1200 }} />
                        </div>
                    </main>
                    <BottomNav />
                </div>
            </MemoryRouter>
        </FinanceContext.Provider>
    </NotificationProvider>
);
