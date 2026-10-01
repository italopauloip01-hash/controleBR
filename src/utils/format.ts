export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

/**
 * Parseia uma string de data no formato YYYY-MM-DD como data LOCAL,
 * evitando o bug de deslocamento de um dia causado pela conversão UTC→local.
 * Use sempre que for exibir ou converter datas vindas do banco de dados.
 */
export const parseDateLocal = (dateStr?: string | null): Date => {
    if (!dateStr || typeof dateStr !== 'string') return new Date(NaN);
    const parts = dateStr.split('-');
    if (parts.length < 3) return new Date(NaN);
    const [year, month, day] = parts.map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date(NaN);
    return new Date(year, month - 1, day);
};

/**
 * Retorna a data de hoje no formato YYYY-MM-DD usando o horário LOCAL,
 * garantindo que o valor do campo <input type="date"> seja sempre hoje.
 */
export const todayLocalISO = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
