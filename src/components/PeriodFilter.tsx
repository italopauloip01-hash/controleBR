import { useFinance } from '../context/FinanceContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, setMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PeriodFilter() {
    const { selectedMonth, setSelectedMonth, selectedYear, setSelectedYear } = useFinance();

    const handlePrevMonth = () => {
        if (selectedMonth === 0) {
            setSelectedMonth(11);
            setSelectedYear(selectedYear - 1);
        } else {
            setSelectedMonth(selectedMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 11) {
            setSelectedMonth(0);
            setSelectedYear(selectedYear + 1);
        } else {
            setSelectedMonth(selectedMonth + 1);
        }
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedMonth(parseInt(e.target.value));
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedYear(parseInt(e.target.value));
    };

    // Gerar ultimos 5 anos e proximos 2 anos
    const currentY = new Date().getFullYear();
    const years = Array.from({ length: 8 }, (_, i) => currentY - 5 + i);

    const months = Array.from({ length: 12 }, (_, i) => {
        return format(setMonth(new Date(), i), 'MMMM', { locale: ptBR });
    });

    return (
        <div className="flex bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-1 w-fit mx-auto lg:mx-0 shadow-sm">
            <button
                onClick={handlePrevMonth}
                className="p-2 text-[var(--color-text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-color)] rounded-md transition-colors"
                aria-label="Mês anterior"
            >
                <ChevronLeft size={20} />
            </button>

            <div className="flex items-center mx-2 space-x-2">
                <select
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    className="bg-transparent text-[var(--color-heading)] font-semibold text-center cursor-pointer outline-none capitalize hover:text-[var(--primary)] transition-colors appearance-none"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                >
                    {months.map((month, index) => (
                        <option key={index} value={index} className="text-[var(--color-text)] bg-[var(--bg-card)] capitalize">
                            {month}
                        </option>
                    ))}
                </select>

                <select
                    value={selectedYear}
                    onChange={handleYearChange}
                    className="bg-transparent text-[var(--color-text-muted)] font-medium text-center cursor-pointer outline-none hover:text-[var(--primary)] transition-colors appearance-none"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                >
                    {years.map(year => (
                        <option key={year} value={year} className="text-[var(--color-text)] bg-[var(--bg-card)]">
                            {year}
                        </option>
                    ))}
                </select>
            </div>

            <button
                onClick={handleNextMonth}
                className="p-2 text-[var(--color-text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-color)] rounded-md transition-colors"
                aria-label="Próximo mês"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    );
}
